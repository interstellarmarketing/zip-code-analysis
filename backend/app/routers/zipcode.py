from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
from .. import models, schemas
from ..database import get_db, SessionLocal
from ..utils import zipcode as zip_utils
from .auth import get_current_user

router = APIRouter(prefix="/zipcodes", tags=["zipcodes"])

async def process_usps_validation(list_id: int, user_id: int):
    """Background task to validate ZIP codes with USPS."""
    # Create a new database session for the background task
    db = SessionLocal()
    try:
        db_list = db.query(models.ZipCodeList).filter(
            models.ZipCodeList.id == list_id,
            models.ZipCodeList.user_id == user_id
        ).first()
        
        if not db_list:
            return

        try:
            db_list.validation_status = "in_progress"
            db.commit()

            # Fetch USPS data in batches
            matched_data = await zip_utils.fetch_bulk_usps_data(db_list.zip_codes)
            
            # Update the list with matched data
            db_list.matched_data = matched_data
            db_list.validation_status = "completed"
            db_list.validation_progress = 100
            db.commit()

        except Exception as e:
            print(f"Error in background validation: {str(e)}")
            db_list.validation_status = "failed"
            db_list.validation_error = str(e)
            db.commit()
    finally:
        db.close()

@router.post("/lists", response_model=schemas.ZipCodeList)
async def create_zipcode_list(
    list_data: schemas.ZipCodeListCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Validate ZIP codes
    valid_zips, invalid_zips = await zip_utils.validate_zip_codes(list_data.zip_codes)
    if invalid_zips:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid ZIP codes found: {', '.join(invalid_zips)}"
        )
    
    # Create ZIP code list
    db_list = models.ZipCodeList(
        name=list_data.name,
        description=list_data.description,
        zip_codes=valid_zips,
        user_id=current_user.id
    )
    db.add(db_list)
    db.commit()
    db.refresh(db_list)
    
    # Fetch USPS data in background
    matched_data = await zip_utils.fetch_bulk_usps_data(valid_zips)
    if matched_data:
        db_list.matched_data = matched_data
        db.commit()
    
    return db_list

@router.get("/lists", response_model=List[schemas.ZipCodeList])
async def get_zipcode_lists(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Use a new database session with a short timeout
        db_session = SessionLocal()
        try:
            # Use order_by to ensure consistent results and add autocommit
            lists = db_session.query(models.ZipCodeList)\
                .filter(models.ZipCodeList.user_id == current_user.id)\
                .order_by(models.ZipCodeList.created_at.desc())\
                .offset(skip)\
                .limit(limit)\
                .all()
            
            # Detach objects from session immediately
            for list_obj in lists:
                db_session.expunge(list_obj)
            db_session.commit()
            
            return lists
        except Exception as e:
            db_session.rollback()
            raise e
        finally:
            db_session.close()
    except Exception as e:
        print(f"Error fetching lists: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching lists"
        )

@router.get("/lists/{list_id}", response_model=schemas.ZipCodeList)
async def get_zipcode_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Use a new database session with a short timeout
        db_session = SessionLocal()
        try:
            db_list = db_session.query(models.ZipCodeList)\
                .filter(models.ZipCodeList.id == list_id)\
                .filter(models.ZipCodeList.user_id == current_user.id)\
                .first()
            
            if not db_list:
                raise HTTPException(status_code=404, detail="ZIP code list not found")
            
            # Detach object from session immediately
            db_session.expunge(db_list)
            db_session.commit()
            
            return db_list
        except HTTPException:
            raise
        except Exception as e:
            db_session.rollback()
            raise e
        finally:
            db_session.close()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching list {list_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching list"
        )

@router.put("/lists/{list_id}", response_model=schemas.ZipCodeList)
async def update_zipcode_list(
    list_id: int,
    list_data: schemas.ZipCodeListUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_list = db.query(models.ZipCodeList)\
        .filter(models.ZipCodeList.id == list_id)\
        .filter(models.ZipCodeList.user_id == current_user.id)\
        .first()
    if not db_list:
        raise HTTPException(status_code=404, detail="ZIP code list not found")
    
    # Update fields if provided
    if list_data.name is not None:
        db_list.name = list_data.name
    if list_data.description is not None:
        db_list.description = list_data.description
    if list_data.zip_codes is not None:
        valid_zips, invalid_zips = await zip_utils.validate_zip_codes(list_data.zip_codes)
        if invalid_zips:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid ZIP codes found: {', '.join(invalid_zips)}"
            )
        db_list.zip_codes = valid_zips
        # Update matched data
        matched_data = await zip_utils.fetch_bulk_usps_data(valid_zips)
        if matched_data:
            db_list.matched_data = matched_data
    
    db.commit()
    db.refresh(db_list)
    return db_list

@router.delete("/lists/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zipcode_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_list = db.query(models.ZipCodeList)\
        .filter(models.ZipCodeList.id == list_id)\
        .filter(models.ZipCodeList.user_id == current_user.id)\
        .first()
    if not db_list:
        raise HTTPException(status_code=404, detail="ZIP code list not found")
    
    db.delete(db_list)
    db.commit()
    return None

@router.post("/compare", response_model=schemas.ZipCodeComparison)
async def compare_lists(
    list1_id: int,
    list2_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Get both lists
    list1 = db.query(models.ZipCodeList)\
        .filter(models.ZipCodeList.id == list1_id)\
        .filter(models.ZipCodeList.user_id == current_user.id)\
        .first()
    list2 = db.query(models.ZipCodeList)\
        .filter(models.ZipCodeList.id == list2_id)\
        .filter(models.ZipCodeList.user_id == current_user.id)\
        .first()
    
    if not list1 or not list2:
        raise HTTPException(status_code=404, detail="One or both ZIP code lists not found")
    
    # Compare lists
    comparison = zip_utils.compare_zip_lists(list1.zip_codes, list2.zip_codes)
    
    # Add population changes if matched data is available
    population_changes = {}
    if list1.matched_data and list2.matched_data:
        for zip_code in comparison["common"]:
            if zip_code in list1.matched_data and zip_code in list2.matched_data:
                pop1 = list1.matched_data[zip_code].get("population")
                pop2 = list2.matched_data[zip_code].get("population")
                if pop1 is not None and pop2 is not None and pop1 != pop2:
                    population_changes[zip_code] = {
                        "old": pop1,
                        "new": pop2,
                        "change": pop2 - pop1
                    }
    
    comparison["population_changes"] = population_changes
    return comparison 

@router.post("/upload", response_model=schemas.ZipCodeList)
async def upload_zipcode_list(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"Received file upload: {file.filename}")
    
    try:
        # Read and parse CSV file
        print("Reading file contents...")
        contents = await file.read()
        csv_text = contents.decode('utf-8-sig')  # Handle BOM if present
        csv_reader = csv.reader(csv_text.splitlines())
        
        # Get header row
        header = next(csv_reader)
        print(f"Found header row: {header}")
        
        # Find ZIP code column (assuming it's the first column)
        zip_codes = []
        for i, row in enumerate(csv_reader, 1):
            if row:  # Skip empty rows
                zip_code = row[0].strip()
                zip_codes.append(zip_code)
                print(f"Processing row {i}: {row}")
        
        print(f"Found {len(zip_codes)} ZIP codes in file")
        
        # Validate ZIP codes format only (fast check)
        print("Validating ZIP codes format...")
        valid_zips, invalid_zips = await zip_utils.validate_zip_codes(zip_codes)
        print(f"Validation results: {len(valid_zips)} valid, {len(invalid_zips)} invalid")
        
        if not valid_zips:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid ZIP codes found in file"
            )

        # Create ZIP code list
        print("Creating ZIP code list in database...")
        db_list = models.ZipCodeList(
            name=name,
            description=description,
            zip_codes=valid_zips,
            user_id=current_user.id,
            validation_status="pending"
        )
        db.add(db_list)
        db.commit()
        db.refresh(db_list)
        print(f"Created list with ID: {db_list.id}")
        
        # Schedule USPS data fetch in background
        background_tasks.add_task(process_usps_validation, db_list.id, current_user.id)
        
        return db_list
        
    except Exception as e:
        # If anything fails, make sure to clean up
        print(f"Upload error: {str(e)}")
        if 'db_list' in locals():
            db.delete(db_list)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) 
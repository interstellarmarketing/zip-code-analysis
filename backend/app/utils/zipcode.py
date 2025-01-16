import re
import httpx
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
import asyncio
from fastapi import HTTPException

load_dotenv()

USPS_API_URL = os.getenv("USPS_API_URL", "https://apis.usps.com/addresses/v3")
USPS_OAUTH_URL = "https://apis.usps.com/oauth2/v3"
CONSUMER_KEY = os.getenv("USPS_CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("USPS_CONSUMER_SECRET")
ZIP_CODE_PATTERN = re.compile(r'^\d{5}$')

class USPSClient:
    def __init__(self):
        self.access_token = None
        self.client = httpx.AsyncClient(
            base_url=USPS_API_URL,
            timeout=30.0
        )
        self.oauth_client = httpx.AsyncClient(
            base_url=USPS_OAUTH_URL,
            timeout=30.0
        )
        self.rate_limit_remaining = None
        self.rate_limit_reset = None
        self.min_delay = 0.1  # Start with 100ms delay
        self.max_delay = 2.0  # Max 2s delay
        self.current_delay = self.min_delay

    async def close(self):
        """Close all HTTP clients."""
        await self.client.aclose()
        await self.oauth_client.aclose()

    async def get_access_token(self) -> str:
        """Get OAuth access token from USPS API."""
        if not CONSUMER_KEY or not CONSUMER_SECRET:
            raise HTTPException(
                status_code=500,
                detail="USPS API credentials not configured"
            )

        try:
            response = await self.oauth_client.post(
                "/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": CONSUMER_KEY,
                    "client_secret": CONSUMER_SECRET,
                    "scope": "addresses"
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                }
            )
            response.raise_for_status()
            data = response.json()
            self.access_token = data["access_token"]
            return self.access_token
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get USPS access token: {str(e)}"
            )

    def update_rate_limits(self, response: httpx.Response):
        """Update rate limit tracking from response headers."""
        try:
            self.rate_limit_remaining = int(response.headers.get('X-RateLimit-Remaining', 1000))
            self.rate_limit_reset = float(response.headers.get('X-RateLimit-Reset', 0))
            
            # Adjust delay based on remaining rate limit
            if self.rate_limit_remaining < 100:
                self.current_delay = min(self.current_delay * 1.5, self.max_delay)
            else:
                self.current_delay = max(self.current_delay * 0.8, self.min_delay)
        except (ValueError, TypeError):
            # If headers are missing or invalid, use conservative defaults
            self.current_delay = min(self.current_delay * 1.2, self.max_delay)

    async def ensure_token(self):
        """Ensure we have a valid access token."""
        if not self.access_token:
            await self.get_access_token()

    async def get_city_state(self, zip_code: str) -> Optional[Dict[str, str]]:
        """Get city and state for a ZIP code using USPS API."""
        await self.ensure_token()
        
        try:
            response = await self.client.get(
                "/city-state",
                params={"ZIPCode": zip_code},
                headers={
                    "Authorization": f"Bearer {self.access_token}",
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            )
            
            self.update_rate_limits(response)
            
            # Handle specific status codes as per API documentation
            if response.status_code == 429:  # Too many requests
                print(f"Rate limit exceeded for ZIP {zip_code}")
                await asyncio.sleep(self.current_delay * 2)  # Double the delay
                return None
            elif response.status_code == 400:  # Bad request / Invalid ZIP
                print(f"ZIP code {zip_code} not found in USPS database")
                return {
                    "city": None,
                    "state": None,
                    "error": "ZIP code not found in USPS database"
                }
            elif response.status_code in (401, 403):  # Auth issues
                print("Authentication error with USPS API")
                await self.get_access_token()  # Try to refresh token
                return None
            elif response.status_code == 503:  # Service unavailable
                print("USPS API service temporarily unavailable")
                await asyncio.sleep(self.current_delay * 2)  # Double the delay
                return None
            
            response.raise_for_status()
            data = response.json()
            
            # Validate response format matches API documentation
            if all(key in data for key in ["city", "state", "ZIPCode"]):
                return {
                    "city": data["city"],
                    "state": data["state"]
                }
            else:
                print(f"Unexpected response format for ZIP {zip_code}: {data}")
                return None
                
        except httpx.RequestError as e:
            print(f"Error fetching city/state for {zip_code}: {str(e)}")
            return None
        except Exception as e:
            print(f"Unexpected error for {zip_code}: {str(e)}")
            return None

# Create a global USPS client instance
usps_client = USPSClient()

async def validate_zip_code(zip_code: str) -> bool:
    """Validate if a string is a valid 5-digit ZIP code."""
    return bool(ZIP_CODE_PATTERN.match(zip_code))

async def validate_zip_codes(zip_codes: List[str]) -> tuple[List[str], List[str]]:
    """Validate a list of ZIP codes and return valid and invalid ones."""
    valid_zips = []
    invalid_zips = []
    
    for zip_code in zip_codes:
        if await validate_zip_code(zip_code):
            valid_zips.append(zip_code)
        else:
            invalid_zips.append(zip_code)
    
    return valid_zips, invalid_zips

async def fetch_usps_data(zip_code: str) -> Optional[Dict[str, Any]]:
    """Fetch ZIP code data from USPS API."""
    try:
        # Get city and state data
        location_data = await usps_client.get_city_state(zip_code)
        
        # If we got a successful response
        if location_data and "city" in location_data and "state" in location_data:
            return {
                "city": location_data["city"],
                "state": location_data["state"],
                "usps_valid": True,
                "population": None,
                "latitude": None,
                "longitude": None
            }
        
        # If we got an error response or invalid ZIP code
        return {
            "city": None,
            "state": None,
            "usps_valid": False,
            "error": location_data.get("error", "ZIP code not found in USPS database"),
            "population": None,
            "latitude": None,
            "longitude": None
        }
        
    except Exception as e:
        print(f"Error processing ZIP code {zip_code}: {str(e)}")
        return {
            "city": None,
            "state": None,
            "usps_valid": False,
            "error": str(e),
            "population": None,
            "latitude": None,
            "longitude": None
        }

async def fetch_bulk_usps_data(zip_codes: List[str]) -> Dict[str, Any]:
    """Fetch USPS data for multiple ZIP codes with rate limiting and retries."""
    results = {}
    stats = {
        "total": len(zip_codes),
        "processed": 0,
        "valid": 0,
        "invalid": 0
    }
    
    # Create a new client for the bulk operation
    client = USPSClient()
    max_retries = 3
    
    try:
        # Process ZIP codes in smaller batches for better progress tracking
        batch_size = 20  # Process 20 at a time for progress updates
        for i in range(0, len(zip_codes), batch_size):
            batch = zip_codes[i:i + batch_size]
            
            # Process each ZIP code in the batch
            for zip_code in batch:
                retry_count = 0
                while retry_count < max_retries:
                    try:
                        result = await client.get_city_state(zip_code)
                        
                        if result and result.get("city") and result.get("state"):
                            stats["valid"] += 1
                            results[zip_code] = {
                                "city": result["city"],
                                "state": result["state"],
                                "usps_valid": True,
                                "population": None,
                                "latitude": None,
                                "longitude": None
                            }
                        else:
                            stats["invalid"] += 1
                            results[zip_code] = {
                                "city": None,
                                "state": None,
                                "usps_valid": False,
                                "error": result.get("error", "ZIP code not found"),
                                "population": None,
                                "latitude": None,
                                "longitude": None
                            }
                        break
                        
                    except Exception as e:
                        retry_count += 1
                        if retry_count == max_retries:
                            print(f"Failed to process {zip_code} after {max_retries} retries: {str(e)}")
                            stats["invalid"] += 1
                            results[zip_code] = {
                                "city": None,
                                "state": None,
                                "usps_valid": False,
                                "error": f"Failed after {max_retries} retries: {str(e)}",
                                "population": None,
                                "latitude": None,
                                "longitude": None
                            }
                        else:
                            await asyncio.sleep(client.current_delay * (2 ** retry_count))
                
                stats["processed"] += 1
                
                # Add a small delay between requests to avoid rate limiting
                if stats["processed"] < stats["total"]:
                    await asyncio.sleep(client.current_delay)
            
            # Print progress after each batch
            print(f"Progress: {stats['processed']}/{stats['total']} "
                  f"(Valid: {stats['valid']}, Invalid: {stats['invalid']})")
    
    except Exception as e:
        print(f"Bulk processing error: {str(e)}")
        raise
    finally:
        await client.close()
    
    results["_stats"] = stats
    return results

def compare_zip_lists(list1: List[str], list2: List[str]) -> Dict[str, List[str]]:
    """Compare two lists of ZIP codes and return the differences."""
    set1 = set(list1)
    set2 = set(list2)
    
    return {
        "added": list(set2 - set1),
        "removed": list(set1 - set2),
        "common": list(set1 & set2)
    } 
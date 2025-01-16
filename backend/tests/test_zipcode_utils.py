import pytest
from app.utils import zipcode
import os
from dotenv import load_dotenv

load_dotenv()

@pytest.mark.asyncio
async def test_validate_zip_code():
    """Test ZIP code validation."""
    assert await zipcode.validate_zip_code("12345") == True
    assert await zipcode.validate_zip_code("1234") == False
    assert await zipcode.validate_zip_code("123456") == False
    assert await zipcode.validate_zip_code("abcde") == False

@pytest.mark.asyncio
async def test_validate_zip_codes():
    """Test bulk ZIP code validation."""
    test_zips = ["12345", "1234", "abcde", "90210"]
    valid, invalid = await zipcode.validate_zip_codes(test_zips)
    assert valid == ["12345", "90210"]
    assert invalid == ["1234", "abcde"]

@pytest.mark.asyncio
async def test_usps_api_integration():
    """Test USPS API integration if API key is available."""
    if not os.getenv("USPS_API_KEY"):
        pytest.skip("USPS API key not configured")
    
    # Test with a known valid ZIP code (Beverly Hills, CA)
    result = await zipcode.fetch_usps_data("90210")
    assert result is not None
    assert "city" in result
    assert "state" in result
    assert result["state"] == "CA"
    assert result["city"] == "BEVERLY HILLS"

@pytest.mark.asyncio
async def test_bulk_usps_data():
    """Test bulk ZIP code data fetching with rate limiting."""
    if not os.getenv("USPS_API_KEY"):
        pytest.skip("USPS API key not configured")
    
    test_zips = ["90210", "10001", "60601"]  # Beverly Hills, Manhattan, Chicago
    results = await zipcode.fetch_bulk_usps_data(test_zips)
    
    assert len(results) > 0
    for zip_code in test_zips:
        if zip_code in results:
            assert "city" in results[zip_code]
            assert "state" in results[zip_code]

def test_compare_zip_lists():
    """Test ZIP code list comparison."""
    list1 = ["12345", "23456", "34567"]
    list2 = ["23456", "34567", "45678"]
    
    comparison = zipcode.compare_zip_lists(list1, list2)
    assert comparison["removed"] == ["12345"]
    assert comparison["added"] == ["45678"]
    assert set(comparison["common"]) == {"23456", "34567"} 
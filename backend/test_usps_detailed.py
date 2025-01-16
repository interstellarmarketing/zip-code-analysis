import asyncio
import httpx
from dotenv import load_dotenv
import os

load_dotenv()

USPS_API_URL = os.getenv("USPS_API_URL", "https://apis.usps.com/addresses/v3")
USPS_OAUTH_URL = "https://apis.usps.com/oauth2/v3"
CONSUMER_KEY = os.getenv("USPS_CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("USPS_CONSUMER_SECRET")

async def test_oauth():
    """Test OAuth token endpoint"""
    print("\n=== Testing OAuth Token Endpoint ===")
    print(f"OAuth URL: {USPS_OAUTH_URL}")
    print(f"Consumer Key: {CONSUMER_KEY[:8]}..." if CONSUMER_KEY else "Consumer Key: Not found")
    print(f"Consumer Secret: {CONSUMER_SECRET[:8]}..." if CONSUMER_SECRET else "Consumer Secret: Not found")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{USPS_OAUTH_URL}/token",
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
            print(f"\nOAuth Response Status: {response.status_code}")
            print(f"OAuth Response Headers: {dict(response.headers)}")
            print(f"OAuth Response Body: {response.text}")
            
            if response.status_code == 200:
                return response.json()["access_token"]
            return None
            
        except Exception as e:
            print(f"OAuth Error: {str(e)}")
            return None

async def test_city_state(token: str, zip_code: str):
    """Test city-state endpoint for a specific ZIP code"""
    print(f"\n=== Testing City/State Lookup for {zip_code} ===")
    print(f"API URL: {USPS_API_URL}")
    
    async with httpx.AsyncClient() as client:
        try:
            print("\nMaking request with headers:")
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
            print(headers)
            
            response = await client.get(
                f"{USPS_API_URL}/city-state",
                params={"ZIPCode": zip_code},
                headers=headers
            )
            
            print(f"\nResponse Status: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            print(f"Response Body: {response.text}")
            
        except Exception as e:
            print(f"City/State Error: {str(e)}")

async def main():
    # Test OAuth first
    token = await test_oauth()
    if not token:
        print("\nFailed to get OAuth token. Stopping tests.")
        return
        
    # Test with known valid and invalid ZIP codes
    test_zips = [
        "90210",  # Beverly Hills (known valid)
        "85039",  # One that failed in your upload
        "00000",  # Obviously invalid
        "48921",  # Another one that failed
    ]
    
    for zip_code in test_zips:
        await test_city_state(token, zip_code)
        await asyncio.sleep(1)  # Add delay between requests

if __name__ == "__main__":
    asyncio.run(main()) 
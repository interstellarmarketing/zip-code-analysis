import asyncio
import httpx
from dotenv import load_dotenv
import os

load_dotenv()

USPS_API_URL = os.getenv("USPS_API_URL", "https://apis.usps.com/addresses/v3")
USPS_OAUTH_URL = "https://apis.usps.com/oauth2/v3"
CONSUMER_KEY = os.getenv("USPS_CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("USPS_CONSUMER_SECRET")

async def test_usps_connection():
    print("Testing USPS API Connection...")
    print(f"API URL: {USPS_API_URL}")
    print(f"OAuth URL: {USPS_OAUTH_URL}")
    print(f"Consumer Key: {CONSUMER_KEY[:8]}..." if CONSUMER_KEY else "Consumer Key: Not found")
    print(f"Consumer Secret: {CONSUMER_SECRET[:8]}..." if CONSUMER_SECRET else "Consumer Secret: Not found")
    
    async with httpx.AsyncClient() as client:
        try:
            # Test OAuth token endpoint
            print("\nTesting OAuth token endpoint...")
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
            print(f"OAuth Response Status: {response.status_code}")
            print(f"OAuth Response Body: {response.text}")
            
            if response.status_code == 200:
                token = response.json()["access_token"]
                print("\nTesting ZIP code lookup...")
                # Test with a known valid ZIP code
                zip_response = await client.get(
                    f"{USPS_API_URL}/city-state",
                    params={"ZIPCode": "90210"},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json"
                    }
                )
                print(f"ZIP Lookup Status: {zip_response.status_code}")
                print(f"ZIP Lookup Response: {zip_response.text}")
            
        except httpx.RequestError as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_usps_connection()) 
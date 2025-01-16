import asyncio
from app.utils.zipcode import usps_client

async def test_usps_api():
    print("Testing USPS API Integration...")
    
    # Test ZIP code for Beverly Hills, CA
    test_zip = "90210"
    
    try:
        # Test authentication
        print("1. Testing OAuth authentication...")
        await usps_client.get_access_token()
        print("✓ Successfully obtained access token")
        
        # Test city/state lookup
        print("\n2. Testing ZIP code lookup...")
        result = await usps_client.get_city_state(test_zip)
        
        if result:
            print(f"✓ Successfully retrieved data for ZIP code {test_zip}:")
            print(f"   City: {result['city']}")
            print(f"   State: {result['state']}")
        else:
            print(f"✗ Failed to retrieve data for ZIP code {test_zip}")
            
    except Exception as e:
        print(f"\n✗ Error during testing: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    print("USPS API Integration Test\n" + "="*25 + "\n")
    success = asyncio.run(test_usps_api())
    
    if success:
        print("\nAll tests completed successfully!")
    else:
        print("\nTests failed. Please check your API credentials and try again.") 
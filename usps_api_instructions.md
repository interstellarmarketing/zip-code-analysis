USPS Addresses API (3.1.1)
Overview
The Addresses API validates and standardizes address information, improving delivery accuracy and pricing. It includes utilities for:

ZIP Code™ Lookup: Finds valid ZIP Codes for a city and state.
City/State Lookup: Provides valid cities and states for a given ZIP Code.
Address Standardization: Validates and standardizes USPS domestic addresses, including ZIP+4®.
Endpoints
Validate Address

Endpoint: /address

Description: Returns the best standardized address for a given input.

Authorization: OAuth

Query Parameters:

firm: (Optional) Firm name, up to 50 characters.
streetAddress (Required): Street number and name.
secondaryAddress: Secondary unit (e.g., APT, STE).
city: City name.
state (Required): Two-character state code.
urbanization: Urbanization code (Puerto Rico only).
ZIPCode: 5-digit ZIP code.
ZIPPlus4: 4-digit ZIP+4® code.
Responses:

200: Successful operation.
400: Bad request.
401: Unauthorized.
403: Access denied.
404: Address not found.
429: Too many requests.
503: Service unavailable.
Response Example:

json
Copy code
{
  "firm": "string",
  "address": {
    "streetAddress": "string",
    "streetAddressAbbreviation": "string",
    "secondaryAddress": "string",
    "cityAbbreviation": "string",
    "city": "string",
    "state": "st",
    "ZIPCode": "string",
    "ZIPPlus4": "string",
    "urbanization": "string"
  },
  "additionalInfo": {
    "deliveryPoint": "string",
    "carrierRoute": "string",
    "DPVConfirmation": "Y",
    "DPVCMRA": "Y",
    "business": "Y",
    "centralDeliveryPoint": "Y",
    "vacant": "Y"
  },
  "corrections": [],
  "matches": [],
  "warnings": ["string"]
}
City/State Lookup

Endpoint: /city-state

Description: Returns the city and state corresponding to a given ZIP Code™.

Authorization: OAuth

Query Parameters:

ZIPCode (Required): 5-digit ZIP code.
Responses:

200: Successful operation.
400: Bad request.
401: Unauthorized.
403: Access denied.
429: Too many requests.
503: Service unavailable.
Response Example:

json
Copy code
{
  "city": "Des Moines",
  "state": "IA",
  "ZIPCode": "50314"
}
ZIP Code Lookup

Endpoint: /zipcode

Description: Returns the ZIP Code™ and ZIP+4® for a given address.

Authorization: OAuth

Query Parameters:

Same as /address.
Responses:

Same as /address.
Response Example:

json
Copy code
{
  "firm": "string",
  "address": {
    "streetAddress": "string",
    "streetAddressAbbreviation": "string",
    "secondaryAddress": "string",
    "cityAbbreviation": "string",
    "city": "string",
    "state": "st",
    "ZIPCode": "string",
    "ZIPPlus4": "string",
    "urbanization": "string"
  }
}
Common Errors
400: Bad request.
401: Unauthorized.
403: Access denied.
404: Not found (specific to /address).
429: Too many requests.
503: Service unavailable.
Authentication
OAuth 2.0: All endpoints require a bearer token in the Authorization header.
Content Type
application/json
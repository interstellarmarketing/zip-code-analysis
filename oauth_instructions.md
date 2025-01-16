OAuth 2.0 (3.0.3) API Summary
Overview
OAuth 2.0 is used to grant authorized access to USPS APIs. Access tokens must be periodically refreshed as they expire after 8 hours, while refresh tokens expire after 7 days. Supported grant types include:

Authorization Code Grant: Exchanges an authorization code for access and refresh tokens. User authentication and consent are required.
Client Credentials Grant: Exchanges client ID and secret for an access token.
Refresh Token Grant: Exchanges a refresh token for a new access token (and optionally another refresh token).
Grant Type Request Parameters
grant_type (required): Specifies the OAuth flow (e.g., authorization_code, client_credentials, refresh_token).
scope (optional): Space-delimited list of permissions requested. Defaults to the client’s predefined scope if omitted.
client_id (required): The unique client identifier issued by USPS.
client_secret (required): The client secret issued by USPS.
code (required for authorization code grant): Authorization code received after user consent.
redirect_uri (required for authorization code grant): Redirect URI used in the authorization code flow.
Token Endpoints
Generate Tokens

Endpoint: /token

Request:

Content-Type: application/x-www-form-urlencoded
Payload Example:
makefile
Copy code
grant_type=client_credentials
&client_id=123456789
&client_secret=A1B2C3D4E5
&scope=ResourceA+ResourceB+ResourceC
Responses:

200: Token issued (returns access_token in JSON Web Token format).
400: Bad request.
401: Unauthorized request.
429: Too many requests.
503: Service unavailable.
Response Example:

json
Copy code
{
  "access_token": "eyJraWQiOiIxMDEwMTAiLCJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "issued_at": 1680888985929,
  "expires_in": 28799,
  "status": "approved",
  "scope": "addresses international-prices subscriptions",
  "issuer": "api.usps.com",
  "client_id": "hyr7b3vCRtpYtAHM1a8cdUrkyyFmNkbg",
  "application_name": "Silver Shipper Developer"
}
Invalidate Tokens

Endpoint: /revoke

Request:

Content-Type: application/x-www-form-urlencoded
Parameters:
token (required): The token (a hash value) to revoke.
token_type_hint: Type of token (default: refresh_token).
Payload Example:
makefile
Copy code
token=ExDTmpomcDt6pTbFVvSgQ1km39YmX8Oy
&token_type_hint=refresh_token
Responses:

200: Token revoked.
400: Bad request.
401: Unauthorized request.
429: Too many requests.
Response Example:

json
Copy code
{
  "error": "invalid_refresh_token",
  "error_description": "refresh_token_expired",
  "refresh_token_status": "Unknown"
}
Headers
Authorization Header:
makefile
Copy code
Authorization: Bearer <access_token>
Basic Auth (for token revocation):
css
Copy code
Authorization: Basic <Base64(client_id:client_secret)>
Additional Notes
Token Expiration:

Access tokens: 8 hours.
Refresh tokens: 7 days.
Best Practices:

Refresh access tokens before they expire if continued access is required.
Revoke tokens immediately if they are no longer needed or suspected to be compromised.
References:

IETF RFC 6749 - OAuth 2.0 Authorization Framework
IETF RFC 7009 - OAuth 2.0 Token Revocation

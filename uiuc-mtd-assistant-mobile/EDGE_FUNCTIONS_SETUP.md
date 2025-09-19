# Edge Functions Setup Guide for UIUC MTD Assistant

This guide provides instructions for setting up and deploying the CUMTD API proxy Edge Functions.

## Prerequisites

1. **Supabase CLI** - Install if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. **CUMTD API Key** - Get your API key from [CUMTD Developer Portal](https://developer.cumtd.com/)

## Setup Steps

### 1. Login to Supabase CLI

```bash
supabase login
```

### 2. Link to Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference (e.g., `risfpuuodmoyrwwvgmip`).

### 3. Set Environment Variables

Set your CUMTD API key as a secret in Supabase:

```bash
supabase secrets set CUMTD_API_KEY=your_cumtd_api_key_here
```

### 4. Deploy Edge Functions

Deploy all three Edge Functions:

```bash
# Deploy departures function
supabase functions deploy transit-departures

# Deploy vehicles function  
supabase functions deploy transit-vehicles

# Deploy trip planner function
supabase functions deploy transit-planner
```

### 5. Test the Functions

You can test the functions using curl or the Supabase dashboard:

#### Test Departures Function:
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/transit-departures' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"stop_id": "ILLINI"}'
```

#### Test Vehicles Function:
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/transit-vehicles' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"route_id": "1"}'
```

#### Test Trip Planner Function:
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/transit-planner' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"origin": "UIUC Campus", "destination": "Downtown Champaign"}'
```

## Function Endpoints

### `/transit-departures`
- **Method**: POST
- **Body**: `{"stop_id": "STOP_ID"}`
- **Returns**: Array of departures for the specified stop
- **Cache**: 60 seconds

### `/transit-vehicles`
- **Method**: POST  
- **Body**: `{"route_id": "ROUTE_ID"}`
- **Returns**: Array of vehicles for the specified route
- **Cache**: 60 seconds

### `/transit-planner`
- **Method**: POST
- **Body**: `{"origin": "ORIGIN", "destination": "DESTINATION", "arrive_by": "TIME"}` (optional)
- **Returns**: Array of trip plan options
- **Cache**: 75 seconds

## Features

- **CORS Support**: All functions include proper CORS headers
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Response Normalization**: Consistent JSON response format across all functions
- **Caching**: HTTP cache headers to reduce API calls
- **Rate Limiting**: Built-in rate limiting through Supabase Edge Functions
- **API Key Security**: CUMTD API key is stored securely as a secret

## Troubleshooting

### Function Not Found (404)
- Ensure the function is deployed: `supabase functions list`
- Check the function name matches exactly

### Authentication Error (401)
- Verify your Supabase anon key is correct
- Check that the Authorization header is properly formatted

### CUMTD API Error (500)
- Verify your CUMTD API key is set: `supabase secrets list`
- Check the CUMTD API is accessible and your key is valid

### CORS Issues
- The functions include CORS headers, but ensure your client is making requests to the correct domain
- Check that the request method matches (POST for all functions)

## Local Development

To test functions locally:

```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# Test locally
curl -X POST 'http://localhost:54321/functions/v1/transit-departures' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"stop_id": "ILLINI"}'
```

## Monitoring

Monitor function performance and errors in the Supabase dashboard:
1. Go to your project dashboard
2. Navigate to "Edge Functions"
3. Click on individual functions to see logs and metrics

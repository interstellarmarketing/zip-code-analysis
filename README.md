# ZIP Code Analysis Tool

A modern web application for managing, analyzing, and comparing ZIP code lists with real-time location data validation.

## Features

- **ZIP Code List Management**
  - Create and manage multiple ZIP code lists
  - Upload ZIP codes via CSV files
  - Add/remove individual ZIP codes
  - Automatic city and state lookup using either:
    - Zippopotam.us API (current implementation)
    - USPS Address Information API (alternative option)

- **List Comparison**
  - Compare any two ZIP code lists
  - View added, removed, and unchanged ZIP codes
  - Get instant comparison statistics

- **Data Validation**
  - Real-time ZIP code validation
  - Automatic city and state information lookup
  - Population data (when using USPS API)
  - Error handling for invalid ZIP codes

- **Modern UI**
  - Clean, responsive design
  - Interactive dashboard
  - Real-time updates
  - Loading states and error handling

## Tech Stack

- **Frontend**
  - Next.js 14 (React)
  - TypeScript
  - Tailwind CSS
  - Supabase Client

- **Backend**
  - Supabase (PostgreSQL)
  - Row Level Security (RLS)
  - Real-time subscriptions

- **APIs**
  - Current: Zippopotam.us for basic ZIP code validation
  - Alternative: USPS Web Tools API for enhanced data
    - More accurate validation
    - Additional data fields (population, coordinates)
    - Official postal service data
  - Supabase Auth for user management

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- (Optional) USPS Web Tools API credentials

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/interstellarmarketing/zip-code-analysis.git
   cd zip-code-analysis
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Optional: USPS API credentials
   # USPS_USER_ID=your_usps_user_id
   # USPS_API_URL=http://production.shippingapis.com/ShippingAPI.dll
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### API Setup Options

#### Option 1: Zippopotam.us (Current Implementation)
- Free to use
- No authentication required
- Rate limited
- Basic ZIP code data (city, state)

#### Option 2: USPS Web Tools API
1. Sign up for USPS Web Tools API access at https://www.usps.com/business/web-tools-apis/
2. Request API credentials for the Address Information API
3. Add your credentials to the `.env.local` file
4. Update the API client to use USPS endpoints

Benefits of USPS API:
- Official postal service data
- Higher rate limits
- More detailed information
- Better validation accuracy

### Database Setup

1. Create a new Supabase project
2. Run the following SQL to set up the tables:

```sql
-- Create tables
CREATE TABLE zip_code_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE zip_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES zip_code_lists(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_zip_codes_list_id ON zip_codes(list_id);
CREATE INDEX idx_zip_codes_user_id ON zip_codes(user_id);
CREATE INDEX idx_zip_code_lists_user_id ON zip_code_lists(user_id);

-- Enable Row Level Security
ALTER TABLE zip_code_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE zip_codes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON zip_code_lists
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for users based on user_id" ON zip_code_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON zip_code_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON zip_code_lists
  FOR DELETE USING (auth.uid() = user_id);

-- Repeat for zip_codes table
CREATE POLICY "Enable read access for all users" ON zip_codes
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for users based on user_id" ON zip_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON zip_codes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON zip_codes
  FOR DELETE USING (auth.uid() = user_id);
```

## Usage

1. Register/Login to access the dashboard
2. Create a new ZIP code list
3. Add ZIP codes via:
   - CSV file upload
   - Manual entry
4. View list details and manage ZIP codes
5. Compare lists to analyze changes

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Zippopotam.us](https://api.zippopotam.us) for providing ZIP code data
- [Supabase](https://supabase.com) for backend infrastructure
- [Next.js](https://nextjs.org) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com) for styling 
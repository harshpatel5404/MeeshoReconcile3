# Embedded Credentials Reference

All credentials are now embedded directly in the code for easy future usage:

## Firebase Configuration (Client & Server)
- **Project ID**: reconme-fbee1
- **API Key**: AIzaSyCLtVv-8X3mBfKeCkS_Q0nqk-7DoPfDo4c
- **App ID**: 1:511599323860:web:38ac9cf5e061ff350e2941
- **Messaging Sender ID**: 511599323860

## Database Configuration  
- **Supabase URL**: postgresql://postgres:$Harsh98@db.tepwrjnmaosalngjffvy.supabase.co:5432/postgres

## Test Login Credentials
- **Email**: test@gmail.com
- **Password**: test1234

## File Locations
- Client Firebase Config: `client/src/lib/firebase.ts`
- Server Firebase Config: `server/services/firebase.ts`
- Database Config: `server/storage.ts`

All configurations are embedded with fallbacks, so the application will work immediately after download without any environment setup required.
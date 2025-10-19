# User Profile Auto-Fill for Patient Registration

## Overview
When admin or reception staff click "Register as New Patient" from the appointment requests page, the system now automatically fetches and pre-fills all available profile data from the user's account and any existing patient records.

## How It Works

### 1. Request Flow
```
Appointment Request → Click "Register as New Patient" 
    ↓
Fetch User Profile Data (from User table)
    ↓
Fetch Patient Data (if exists in Patient table)
    ↓
Redirect to Patients Page with all data as URL parameters
    ↓
Auto-open modal with pre-filled form
```

### 2. Data Sources

#### From User Account:
- Name (split into firstName/lastName)
- Email
- Phone

#### From Patient Record (if exists):
- Date of Birth (dob)
- Age
- Address
- Gender
- Occupation
- Height
- Weight
- Father/Husband/Guardian Name
- Profile Image URL

### 3. Files Modified

#### `pages/requests.tsx`
**Function: `handleRegisterPatient()`**
- Changed from simple function to async function
- Fetches complete user profile from `/api/users`
- Fetches existing patient data from `/api/patients`
- Matches patient by email or phone
- Builds comprehensive URLSearchParams with all available data
- Includes fallback if API calls fail

```typescript
async function handleRegisterPatient(request: AppointmentRequest) {
    // Fetch user profile
    const users = await fetch('/api/users').then(r => r.json())
    const userProfile = users.find(u => u.id === request.userId)
    
    // Fetch patient data if exists
    const patients = await fetch('/api/patients').then(r => r.json())
    const patientData = patients.find(p => 
        p.email === request.userEmail || p.phone === request.userPhone
    )
    
    // Pass all data via URL params
    router.push(`/patients?${params.toString()}`)
}
```

#### `pages/patients.tsx`
**Added fatherHusbandGuardianName to emptyForm:**
```typescript
const emptyForm = { 
    firstName: '', lastName: '', phone: '', email: '', 
    dob: '', opdNo: '', date: '', age: '', address: '', 
    gender: '', nextVisitDate: '', nextVisitTime: '', 
    occupation: '', pendingPaymentCents: '', height: '', 
    weight: '', imageUrl: '', fatherHusbandGuardianName: '' 
}
```

**Updated useEffect for URL parameters:**
- Reads all profile fields from router.query
- Pre-fills form with complete data
- Sets image preview if imageUrl is provided
- Auto-opens modal for immediate editing

```typescript
useEffect(() => {
    if (router.isReady && router.query.requestId) {
        const { 
            name, email, phone, dob, age, address, 
            gender, occupation, height, weight, 
            fatherHusbandGuardianName, imageUrl 
        } = router.query
        
        // Pre-fill all available fields
        setForm(prev => ({ ...prev, /* all fields */ }))
        
        // Set image preview
        if (imageUrl) setImagePreview(imageUrl)
        
        // Auto-open modal
        openModal()
    }
}, [router.isReady, router.query])
```

**Updated edit patient form:**
- Added fatherHusbandGuardianName field to setForm in edit function

## Benefits

✅ **Saves Time**: Admin/reception don't need to re-enter data the user already provided
✅ **Reduces Errors**: Data is automatically populated from verified sources
✅ **Better UX**: Modal opens automatically with pre-filled data ready to review
✅ **Comprehensive**: Pulls from both User and Patient tables for maximum data coverage
✅ **Fallback Safe**: If profile data fetch fails, still provides basic request data

## User Experience Flow

1. **Admin sees appointment request** with user details
2. **Clicks "Register as New Patient"**
3. **System fetches** user's profile and any existing patient data
4. **Redirects to patients page** with all data in URL
5. **Modal opens automatically** with form pre-filled
6. **Admin reviews/completes** any missing required fields
7. **Submits form** to create patient record
8. **System updates** appointment request with patientId
9. **Redirects back** to requests page
10. **Button shows** "✓ Patient Registered" (disabled)

## Technical Details

### URL Parameters Passed:
- `requestId` - Links back to appointment request
- `userId` - Original user ID
- `name` - Full name
- `email` - Email address
- `phone` - Phone number
- `dob` - Date of birth (YYYY-MM-DD format)
- `age` - Calculated age
- `address` - Full address
- `gender` - Gender
- `occupation` - Occupation
- `height` - Height value
- `weight` - Weight value
- `fatherHusbandGuardianName` - Father/Husband/Guardian name
- `imageUrl` - Profile image URL

### API Endpoints Used:
- `GET /api/users` - Fetch all users (admin only)
- `GET /api/patients` - Fetch all patients
- `POST /api/patients` - Create new patient
- `PUT /api/appointment-requests` - Update request with patientId

### Error Handling:
- Try-catch blocks for API calls
- Fallback to basic request data if profile fetch fails
- Console logging for debugging
- User-friendly error messages

## Testing Checklist

- [ ] User with complete profile → All fields pre-filled
- [ ] User with partial profile → Available fields pre-filled
- [ ] User with no patient record → Basic fields only
- [ ] User with existing patient record → Full data from both sources
- [ ] API failure → Fallback to request data works
- [ ] Image URL → Preview shows in modal
- [ ] Form submission → Patient created successfully
- [ ] Redirect → Returns to requests page
- [ ] Button state → Shows as disabled after registration

## Future Enhancements

- Add profile completeness indicator on requests page
- Show preview of user profile before redirecting
- Allow admin to view full user profile in modal
- Add bulk patient registration from multiple requests
- Support for updating existing patient records

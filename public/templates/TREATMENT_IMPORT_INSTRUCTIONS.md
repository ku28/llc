# Treatment Plans Import Instructions

## Overview
This guide explains how to import treatment plans using CSV, XLSX, or JSON files. The system will **automatically match product names** to existing products or **create new products** if they don't exist.

## 🔑 Key Concept: Product Name Matching
- **You don't need product IDs!** Just provide the product name
- The system automatically matches product names (case-insensitive)
- If a product doesn't exist, it will be created automatically with:
  - Auto-generated ID
  - Price: $0.00
  - Quantity: 0
- You can update product details later in the Products page

## Required Fields

### Mandatory
1. **planNumber** - Unique identifier for the treatment plan (string)
2. **productName** - Name of the product (will be matched or created)

### Optional Treatment Fields
- **provDiagnosis** - Provisional diagnosis
- **speciality** - Medical speciality
- **organ** - Target organ
- **diseaseAction** - Disease action type
- **treatmentPlan** - Treatment plan description
- **administration** - Administration method
- **notes** - Additional notes

### Optional Product Fields (per row)
- **comp1, comp2, comp3** - Component fields
- **quantity** - Product quantity (default: 1)
- **timing** - When to take (e.g., "Morning", "Evening")
- **dosage** - Dosage information (e.g., "500mg", "2 tablets")
- **additions** - Additional instructions
- **procedure** - Procedure details
- **presentation** - Presentation format
- **droppersToday** - Number of droppers
- **medicineQuantity** - Medicine quantity
  01,Hypertension,...,2,Medicine B
  01,Hypertension,...,3,Medicine C
  ```

### Valid Values for Dropdown Fields

#### Administration
- ORAL
- TOPICAL
- SUBLINGUAL
- EXTERNAL

#### Timing
- BM (Before Meal)
- AM (After Meal)
- RAP (Right After Meal)
- MOR (Morning)
- AFN (Afternoon)
- EVE (Evening)
- HS (At Bedtime)
- SOS (As Needed)
- ALT (Alternate Days)
- OR (Others)

#### Components (comp1, comp2, comp3)
- F1
- BELLADONNA
- BRYONIA
- MERC SOL
- MERC COR
- THUJA
- NIT ACID
- NAT MUR

#### Additions
- LOT/SESAM OIL/
- LOT/EU OIL/
- LOT/FILLER BASE/
- LOT/C3+/
- And other custom additions

#### Procedure
- APL/LOCAL
- APL/ CORN (note: space after slash)
- MSG/NECK
- MSG/BACK
- MSG/LOCAL
- And other custom procedures

#### Presentation
- DROPS
- TABLET
- CAPSULE
- SYRUP
- LOTION
- CREAM
- GEL
- OINTMENT

## Excel Template Setup Instructions

### Step 1: Create Excel File
1. Open Microsoft Excel or Google Sheets
2. Create a new workbook
3. Name the first sheet "TreatmentPlans"

### Step 2: Add Headers (Row 1)
Copy this header row:
```
planNumber | provDiagnosis | speciality | organ | diseaseAction | treatmentPlan | administration | notes | productId | productName | comp1 | comp2 | comp3 | quantity | timing | dosage | additions | procedure | presentation | droppersToday | medicineQuantity
```

### Step 3: Add Data Validation (Optional but Recommended)
For better data quality, add dropdown lists:

**Administration column** (H):
- Data Validation → List
- Source: ORAL,TOPICAL,SUBLINGUAL,EXTERNAL

**Timing column** (O):
- Data Validation → List
- Source: BM,AM,RAP,MOR,AFN,EVE,HS,SOS,ALT,OR

**Presentation column** (S):
- Data Validation → List
- Source: DROPS,TABLET,CAPSULE,SYRUP,LOTION,CREAM,GEL,OINTMENT

### Step 4: Format Columns
- **planNumber**: Text format (to preserve leading zeros like "01")
- **productId**: Number format
- **quantity**: Number format
- **droppersToday**: Number format
- **medicineQuantity**: Number format
- All other fields: Text format

## Sample Data

### Example 1: Simple Treatment with Single Product
```csv
planNumber,provDiagnosis,speciality,organ,diseaseAction,treatmentPlan,administration,notes,productId,productName,comp1,comp2,comp3,quantity,timing,dosage,additions,procedure,presentation,droppersToday,medicineQuantity
01,Common Cold,General Medicine,Respiratory,Relieve symptoms,Symptomatic Relief,ORAL,Rest and fluids,5,Cold Medicine,,,100,MOR,10ML,,,SYRUP,,100
```

### Example 2: Complex Treatment with Multiple Products
```csv
planNumber,provDiagnosis,speciality,organ,diseaseAction,treatmentPlan,administration,notes,productId,productName,comp1,comp2,comp3,quantity,timing,dosage,additions,procedure,presentation,droppersToday,medicineQuantity
02,Hypertension,Cardiology,Heart,Reduce BP,Combination Therapy,ORAL,Monitor daily,10,BP Medicine A,F1,BELLADONNA,,2,BM,5 DROPS,LOT/SESAM OIL/,APL/LOCAL,DROPS,3,30
02,Hypertension,Cardiology,Heart,Reduce BP,Combination Therapy,ORAL,Monitor daily,11,BP Medicine B,F2,BRYONIA,,1,AM,10 DROPS,LOT/EU OIL/,MSG/NECK,DROPS,5,60
02,Hypertension,Cardiology,Heart,Reduce BP,Combination Therapy,TOPICAL,Apply twice daily,12,BP Cream,,,,1,EVE,,LOT/FILLER BASE/,MSG/LOCAL,CREAM,,50
```

## Data Import Process

### Before Import
1. ✅ Ensure all **productId** values exist in your Products database
2. ✅ Verify **planNumber** format is consistent
3. ✅ Check all dropdown values match the allowed values
4. ✅ Remove any empty rows at the bottom
5. ✅ Save as .xlsx or .csv format

### Import Steps
1. Go to Treatment Management page
2. Click "Import Treatment Plans" button
3. Select your prepared Excel/CSV file
4. Review the preview of data to be imported
5. Confirm import
6. System will create:
   - Treatment plans (one per unique planNumber)
   - Treatment products (linked to each treatment)

### Error Handling
- ❌ Invalid productId → Row skipped with error message
- ❌ Duplicate planNumber conflict → User prompted to skip/overwrite
- ❌ Invalid dropdown value → Row skipped with warning
- ✅ Empty optional fields → Saved as NULL/empty

## Tips for Best Results

1. **Product IDs**: Export your products list first to get correct productId values
2. **Plan Numbers**: Use consistent numbering (01, 02, 03... or P001, P002, P003...)
3. **Testing**: Start with a small file (2-3 treatments) to test the import
4. **Backup**: Always backup your database before bulk imports
5. **Encoding**: If using special characters, save CSV as UTF-8
6. **Excel Formula**: Avoid formulas in cells, use plain values only

## Support

For issues or questions about the import template:
- Check that your Excel version is 2016 or later
- Verify CSV files are UTF-8 encoded
- Contact system administrator if productId values are unclear

---

**Template Version**: 1.0  
**Last Updated**: October 26, 2025  
**Compatible with**: LLC ERP v1.0+

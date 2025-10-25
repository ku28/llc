# Treatment Plans Import - Quick Reference Card

## 📋 Required Columns
- ✅ **planNumber** - Unique identifier (e.g., 01, 02, 03)
- ✅ **productId** - Must exist in Products database

## 📝 Optional Treatment Fields
- provDiagnosis
- speciality
- organ
- diseaseAction
- treatmentPlan
- administration (ORAL/TOPICAL/SUBLINGUAL/EXTERNAL)
- notes

## 💊 Optional Product Fields
- productName (reference only)
- comp1, comp2, comp3 (Components)
- quantity (default: 1)
- timing (BM/AM/RAP/MOR/AFN/EVE/HS/SOS/ALT/OR)
- dosage (e.g., 5 DROPS, 500MG, 10ML)
- additions (e.g., LOT/SESAM OIL/)
- procedure (e.g., APL/LOCAL, MSG/NECK)
- presentation (DROPS/TABLET/CAPSULE/SYRUP/etc.)
- droppersToday
- medicineQuantity

## 🔄 Multiple Products Per Plan
Use same planNumber for multiple rows:
```
01,Hypertension,...,productId:1
01,Hypertension,...,productId:2
01,Hypertension,...,productId:3
```

## ⚠️ Important Rules
1. Save as .xlsx or .csv (UTF-8)
2. No empty rows in the middle
3. ProductId must be valid
4. PlanNumber format: text with leading zeros
5. Test with small file first

## 📥 Download Template
- CSV Template: `/templates/treatment_plans_import_template.csv`
- Full Instructions: `/templates/TREATMENT_IMPORT_INSTRUCTIONS.md`

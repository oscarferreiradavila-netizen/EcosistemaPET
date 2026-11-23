with open('pet_ct_triage/web_app/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')
print(f"Total lines: {len(lines)}")
for func in ['getPatientMobilityHospitalizationInfo', 'isFirstSlotOfDayOrShift', 'resetAllPatientCitations', 'runTriageAutoScheduler']:
    matches = [i+1 for i, l in enumerate(lines) if func in l]
    print(f"Function {func}: found at lines {matches[:5]}")

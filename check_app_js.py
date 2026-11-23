with open('pet_ct_triage/web_app/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')
print(f"Total lines in app.js: {len(lines)}")
for keyword in ['renderCustomSlotsTable', 'getRadiofarmacoSupplierInfo', 'currentDayCustomSlots', 'btn-add-custom-slot']:
    matches = [i+1 for i, l in enumerate(lines) if keyword in l]
    print(f"Keyword '{keyword}': found {len(matches)} times (first at line {matches[0] if matches else -1})")

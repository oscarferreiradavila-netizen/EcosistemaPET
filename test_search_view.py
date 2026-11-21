import subprocess
import time
import os

html_path = os.path.abspath('pet_ct_triage/web_app/index.html')

# We can launch chrome and take a screenshot after typing into the search input
# Let's create a temporary modified index or inject script
with open('pet_ct_triage/web_app/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Inject a small script right before </body> to simulate search for 'Ignacio'
test_script = """
<script>
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const input = document.getElementById('top-patient-search-input');
    if (input) {
      input.value = 'Ignacio';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('Search triggered for Ignacio');
    }
  }, 1000);
});
</script>
"""

test_html_path = os.path.abspath('pet_ct_triage/web_app/test_screenshot.html')
with open(test_html_path, 'w', encoding='utf-8') as f:
    f.write(content.replace('</body>', test_script + '</body>'))

print("Test file created:", test_html_path)

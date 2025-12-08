const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'src/composables/__tests__/useContentEditable.spec.js');
let content = fs.readFileSync(testFile, 'utf8');

// Fix all ref assignments to use .value
content = content.replace(
  /:ref="el => editable\.elementRef = el"/g,
  ':ref="el => { if (editable.elementRef) editable.elementRef.value = el }"'
);

// Fix line 271 - accessing elementRef directly instead of .value
content = content.replace(
  /wrapper\.vm\.editable\.elementRef\.textContent = 'Same Content'/g,
  "wrapper.vm.editable.elementRef.value.textContent = 'Same Content'"
);

// Fix line 291 - accessing elementRef directly instead of .value
content = content.replace(
  /wrapper\.vm\.editable\.elementRef\.textContent = ''/g,
  "wrapper.vm.editable.elementRef.value.textContent = ''"
);

fs.writeFileSync(testFile, content);
console.log('Fixed useContentEditable.spec.js');

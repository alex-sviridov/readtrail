const fs = require('fs');

// Fix useContentEditable tests
let content = fs.readFileSync('src/composables/__tests__/useContentEditable.spec.js', 'utf8');

// Replace all editable property accesses to add .value
content = content.replace(/wrapper\.vm\.editable\.(isEditing|fontSize|currentContent|elementRef)([^.])/g, 'wrapper.vm.editable.$1.value$2');

fs.writeFileSync('src/composables/__tests__/useContentEditable.spec.js', content);

// Fix useDatePicker tests  
content = fs.readFileSync('src/composables/__tests__/useDatePicker.spec.js', 'utf8');

// Replace all picker property accesses to add .value
content = content.replace(/wrapper\.vm\.picker\.(currentYear|currentTime|isUnfinishedToggled|maxYear|canDecrementYear|canIncrementYear|buttonBaseClasses)([^.])/g, 'wrapper.vm.picker.$1.value$2');

fs.writeFileSync('src/composables/__tests__/useDatePicker.spec.js', content);

console.log('Fixed ref accesses in test files');

// Generate a uuid
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Clone an object
function dc(v) {
  return JSON.parse(JSON.stringify(v));
}

// Search for a key recursively inside an object
let search = (needle, haystack, found = []) => {
  Object.keys(haystack).forEach((key) => {
    if(key.match(needle)){
      found.push({key: key, value: haystack[key]});
      return found;
    }
    if(haystack[key] && typeof haystack[key] === 'object'){
      search(needle, haystack[key], found);
    }
  });
  return found;
};
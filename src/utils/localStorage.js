const storage = field => {
  const get = val => {
    const item = localStorage.getItem(field);
    if (item) {
      try {
        const data = JSON.parse(item);
        return val ? data[val] || null : data;
      } catch (err) {
        return null;
      }
    }
    return null;
  };

  const set = val => {
    const item = get();
    const newItem =
      typeof val !== 'string' ? { ...item, ...val } : { ...item, [val]: val };
    localStorage.setItem(field, JSON.stringify(newItem));
  };

  const clear = () => {
    localStorage.removeItem(field);
  };


  return { get, set, clear };
};

export { storage };

function calculatePrice({ weight = 0.5, fromCity, toCity, parcelType = 'general', isFragile = false }) {
  const base = 40;
  const perKg = 15;
  const intercity = (fromCity || '').toLowerCase() !== (toCity || '').toLowerCase() ? 60 : 0;
  const fragile = isFragile ? 20 : 0;
  const typeMultiplier = { document: 0.8, book: 0.9, general: 1.0, parcel: 1.1, fragile: 1.3 };
  const m = typeMultiplier[parcelType] || 1.0;
  const subtotal = Math.round((base + weight * perKg + intercity + fragile) * m);
  const tax = Math.round(subtotal * 0.18);
  return {
    subtotal,
    tax,
    total: subtotal + tax,
    breakdown: { base, weight_charge: Math.round(weight * perKg * m), intercity, fragile, tax }
  };
}

module.exports = { calculatePrice };

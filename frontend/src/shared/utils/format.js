const nf = new Intl.NumberFormat("fa-IR");

export const formatNumber = (value) => nf.format(Number(value));
export const formatPrice = (value) => `${nf.format(Number(value))} تومان`;

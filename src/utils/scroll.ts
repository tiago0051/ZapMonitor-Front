export const IsTopScrolled = (element: HTMLElement) => {
  const scrollView = Math.abs(element.scrollTop) + element.clientHeight;

  const scrollInTop = element.scrollHeight === scrollView;

  return scrollInTop;
};

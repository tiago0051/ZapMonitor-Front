export const IsTopScrolled = (element: HTMLElement) => {
  const scrollView = Math.abs(element.scrollTop) + element.clientHeight + 20;

  const scrollInTop = element.scrollHeight <= scrollView;

  return scrollInTop;
};

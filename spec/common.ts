export const failFunc = (err: any) => {
  console.log(err);
  expect('this test').toBe('working');
};

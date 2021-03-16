const sayHi = require('../../modules/sayHi');

describe('sayHi()', () => {
  it('should return true', () => {
    //Testing a boolean
    expect(sayHi('hi')).toBe(`Hello, hi!`);
    //Another way to test a boolean
    expect(sayHi('hi')).toBe(`Hello, hi!`);
  });
});

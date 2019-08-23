// Here, I only "replaced" `it` and `context` by `then.it`, `given` & `when` in order to make it more simple to understand.
const given = when = context;
const then = { it };

context('<my-component>', () => {
  const el;

  then.elShouldBeCoolAndGreat = () => {
    then.it('is cool', () => {
      expect(el).to.be.cool;
    });

    then.it(`is great`, () => {
      expect(el).to.be.great;
    });
  }

  given('attribute foo="bar"', () => {
    beforeEach(() => {
      el = fixture('<my-component foo="bar"><my-component');
    });

    then.elShouldBeCoolAndGreat();

    when('attribute foo is set to a new string', () => {
      beforeEach(() => {
        el.setAttribute('foo', 'baz');
      });

      then.elShouldBeCoolAndGreat();
    });
    describe('When: attribute foo is set to an empty string', () => {
      // etc...
    });
  });
});
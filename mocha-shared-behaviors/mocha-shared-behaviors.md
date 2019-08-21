---
title: Shared Behaviors best practices with Mocha
published: false
description:
tags: testing, mocha, open-wc, web components
---

Like (I hope, at least) any of you, I love unit testing! Because a good coverage on a codebase makes me confident.
Tests help me understand what a code is about! Above all, they make me feel a little less dumb and angry when I code :wink:!

But here is something that tends to make every developer feel dumb and angry when they write or read tests: sharing
behaviors!

I see two reasons here:

1. sharing behaviors (can, often) leads to over-engineering tests
2. there are too many (bad) ways to do it

So, take a nice cup of tea, relax, and let me help you better understand how to do it right!

## tl;dr

Check out examples and the decision flowchart in the associated project on Github:

{% github noelmace/mocha-shared-behaviors %}

## The (old) Mocha way

First things first! Let's see what the Mocha [documentation](https://github.com/mochajs/mocha/wiki/Shared-Behaviours)
itself says about this!

Mocha bind its context (the Mocha "contexts", aka the "this" keyword) to every callback you give to it. Meaning, in the
function you give to `describe`, `before`, `beforeEach`, `it`, `after` & `afterEach`, you can assign to `this` any data
or function you want, making it available for all the callbacks which will be called after that in the same `describe`.

To illustrate how to use this in order to write shared behaviors, Mocha gives the following example.

> FYI, I took the liberty to update this code in an "Open WC" way, using ES Modules and `expect` instead of CommonJS and
> `should`.

Here is the code we want to test.

```javascript
/// user.js
export function User(first, last) {
  this.name = {
    first: first,
    last: last
  };
}

User.prototype.fullname = function() {
  return this.name.first + ' ' + this.name.last;
};

/// admin.js
import { User } from './user.js';

export function Admin(first, last) {
  User.call(this, first, last);
  this.admin = true;
}

Admin.prototype.__proto__ = User.prototype;
```

`Admin` obviously share some behaviors with `User`. So, we can write this shared behaviors in a function using "
contexts":

```javascript
/// helpers.js
import { expect } from '@open-wc/testing';

export function shouldBehaveLikeAUser() {
  it('should have .name.first', function() {
    expect(this.user.name.first).to.equal('tobi');
  });

  it('should have .name.last', function() {
    expect(this.user.name.last).to.equal('holowaychuk');
  });

  describe('.fullname()', function() {
    it('should return the full name', function() {
      expect(this.user.fullname()).to.equal('tobi holowaychuk');
    });
  });
}
```

Finally, here are our tests:

```javascript
/// user.test.js
import { User } from '../user.js';
import { shouldBehaveLikeAUser } from './helpers.js';
import { expect } from '@open-wc/testing';

describe('User', function() {
  beforeEach(function() {
    this.user = new User('tobi', 'holowaychuk');
  });

  shouldBehaveLikeAUser();
});

/// admin.test.js
import { User } from '../user.js';
import { shouldBehaveLikeAUser } from './helpers.js';
import { expect } from '@open-wc/testing';

describe('Admin', function() {
  beforeEach(function() {
    this.user = new Admin('tobi', 'holowaychuk');
  });

  shouldBehaveLikeAUser();

  it('should be an .admin', function() {
    expect(this.user.admin).to.be.true;
  });
});
```

### What's wrong with this approach

This wiki page [wasn't (really) edited](https://github.com/mochajs/mocha/wiki/Shared-Behaviours/_history) since January 2012! Way before ES2015!

This is why Mocha decided to [discourage using arrow
functions](https://github.com/mochajs/mocha/commit/2a91194f74ba09a4cf345b6accce2abac91b473a) in 2015 ... and no update
to this section of the documentation was done since.

Besides that it's pretty old, there is also no documentation about fields ownership, so you're exposed to future
conflicts any time you use the Mocha "contexts".

Yet, those aren't the main issues with this approach! Following it, there is no way to clearly identify the requirements of your shared
behavior. In other words, you can't see the required data types and signature in its declaration context (i.e. closure)
nor in the function signature (i.e. arguments). This isn't the better choice for readability and maintainability.

There has been and still is some discussions about this approach. Especially, Christopher Hiller aka Boneskull,
maintainer of Mocha since July 2014, published a first attempt of a ["functional"
interface](https://github.com/mochajs/mocha/pull/3399) in May 2018 (check out the issues referenced at the end of this
article for more information on this). Yet, this PR is still open, and we can't, I think, expect any advancement on this
soon.

## Keep it simple, stupid!

To reiterate: **over-engineering is one of the main danger when defining shared behaviors in your tests**!

I believe the KISS  principle is the top principle to keep in mind when you write tests! Think "YAGNI"! Yes,
KISS is at the core of every good engineering! But when it comes to testing, it's its FUSION REACTOR CORE :bomb: !
Forget about it, and it's the apocalypse of your project! Guaranteed!

In case you still have any doubt about that, here is an argument from authority :wink:

Jasmine permits handling shared behaviors pretty much the same way Mocha does (i.e. using the "this" keyword). Concerned
about this question, the contributors added the following "Caveats" chapter to the related documentation page:

> Sharing behaviors in tests can be a powerful tool, but use them with caution.
>
> - Overuse of complex helper functions can lead to logic in your tests, which in turn may have bugs of its own - bugs
>   that could lead you to think you're testing something that you aren't. Be especially wary about conditional logic (if
>   statements) in your helper functions.
>
> - Having lots of tests defined by test loops and helper functions can make life harder for developers. For example,
>   searching for the name of a failed spec may be more difficult if your test names are pieced together at runtime. If
>   requirements change, a function may no longer "fit the mold" like other functions, forcing the developer to do more
>   refactoring than if you had just listed out your tests separately.

So, yes, of course, writing shared behaviors using the "`this` keyword" does work. And it can be pretty useful from time to time.
But it can also bring a lot of unneeded complexity to your tests!

**Avoid using the Mocha context as much as you can!**
_Same thing for shared behaviors in general!_

## from complexity to simplicity

In order to do so, let's deconstruct our previous example, and minimize its complexity step-by-step.

### integrated setup or tear down

Back to the ["functional"
interface](https://github.com/mochajs/mocha/pull/3399) PR. Why would we need a "functional" interface in Mocha in the first place?

Let's try to rewrite the previous example using an arrow function. Of course, a lambda doesn't have a "this", so here
we'll try to use its closure.

```javascript
/// helpers.js
export function shouldBehaveLikeAUser(user) {
  it('should have .name.first', () => {
    expect(user.name.first).to.equal('tobi');
  });
  // other tests
}

/// user.test.js
describe('User', () => {
  let user;

  beforeEach(() => {
    user = new User('tobi', 'holowaychuk');
  });

  shouldBehaveLikeAUser(user);
});
```

Let's run this and...:boom: it fails!

```
TypeError: Cannot read property 'name' of undefined
  at Context.name (test/helpers.js:5:17)
```

This is because Mocha identify and "record" your test suite first, and _then_ run your callbacks! So here, it runs
`beforeEach` and `shouldBehaveLikeAUser` (`user` being undefined at this point) and only _then_ `beforeEach.fn` and `it.fn`!

Here, a first solution is to move the `beforeEach` in `shouldBehaveLikeAUser`.

```javascript
/// helpers.js
export function shouldBehaveLikeAUser(constructor) {
  let userLike;
  const firstName = 'tobi';
  const lastName = 'holowachuk';

  context(`when using new ${constructor.name}(${firstName}, ${lastName})`, () => {
    beforeEach(() => {
      userLike = new constructor(firstName, lastName);
    });
    it('should have .name.first', () => {
      expect(userLike.name.first).to.equal(firstName);
    });
    // other tests
  });
}

/// user.test.js
describe('User', () => {
  shouldBehaveLikeAUser(User);
});

/// admin.test.js
describe('Admin', () => {
  shouldBehaveLikeAUser(Admin);
});
```

**Pros :thumbsup::**

- it permits to define your shared behavior in a separated file
- :heavy_plus_sign: nothing is "hidden": just by looking at its signature, we understand that `shouldBehaveLikeAUser` will test that the constructor you gave will fit the "User" behavior definition (this can be enhanced by adding a JSDoc @param or some TypeScript)
- :heavy_plus_sign: it's self-sufficient: no side effect or closure requirements here

**Cons :thumbsdown::**

- it has its own logic: for example, if you add the first argument to the `Admin` constructor, it fails, because you introduced a bug in the shared behavior, and there is a chance you won't see it directly because you didn't define a spec for that
- :heavy_minus_sign: it's isolated: you can't reuse `userLike`, and have to repeat yourself
  ```javascript
  it('should be an .admin', () => {
    expect(new Admin().admin).to.be.true;
  });
  ```

**Conclusion**

You should use this solution if and only you absolutely need specific setup or tear down which are completely isolated from the other behaviors, and if the required parameters aren't too complex.

### split behaviors

One way we can solve these issues is by defining our shared behaviors one by one, spec by spec, like this:

```javascript
export const expectUserLike = user => ({
  toHaveNameFirstAs: mock => {
    expect(user.name.first).to.equal(mock);
  },
  toHaveNameLastAs: mock => {
    expect(user.name.last).to.equal(mock);
  },
  toHaveFullnameThatReturnAs: (...mock) => {
    expect(user.fullname()).to.equal(mock.join(' '));
  }
});
```

And to use those as shown here:

```javascript
/// user.test.js
let user = 'foo';
const constructorArgs = ['tobi', 'holowaychuk'];

describe('User', () => {
  beforeEach(() => {
    user = new User(...constructorArgs);
  });

  it('should have .name.first', () => {
    expectUserLike(user).toHaveNameFirstAs(constructorArgs[0]);
  });

  // other tests
});
```

**Pros :thumbsup::**

- nothing is "hidden": it's even better than with the previous example, as we can follow the Mocha `expect` syntax (if you're into this 😉)
- it's self-sufficient: no side effect or closure requirements here
- :heavy_plus_sign: it isn't isolated
- :heavy_plus_sign: it's simple 💋 (added logic is minimal)

**Cons :thumbsdown::**

- you can only provide one test at a time
- it doesn't require to test every covered aspect of the behavior
- it doesn't define any order
- you have to rewrite every spec description, setup and tear down every time

**Conclusion**

This approach often has my preference. It's simple, self explicit **and** permits to define shared behaviors in separated files.

Yet, I only use it if this last point is an absolute requirement!

### The power of closures

If it isn't, you can simply use the lambda closure to share data between your shared behavior. Take the first example, from the Mocha Wiki. If you took a look at the original one, you may have noticed that `user.test.js` and `admin.test.js` are actually in a single file, `test.js`. `User` and `Admin` being from the same "feature scope", it feels indeed logical to test those two as one.

Following this idea, let's refactor a little.

```javascript
let userLike;

const shouldBehaveLikeAUser = (firstName, lastName) => {
  it('should have .name.first', () => {
    expect(userLike.name.first).to.equal(firstName);
  });
  // other tests
};

describe('User', () => {
  const firstName = 'tobi';
  const lastName = 'holowachuk';

  beforeEach(() => {
    userLike = new User(firstName, lastName);
  });

  shouldBehaveLikeAUser(firstName, lastName);
});

describe('Admin', () => {
  const firstName = 'foo';
  const lastName = 'bar';

  beforeEach(() => {
    userLike = new Admin(firstName, lastName);
  });

  shouldBehaveLikeAUser(firstName, lastName);

  it('should be an .admin', () => {
    expect(userLike.admin).to.be.true;
  });
});
```

#### my 2 cents

Most of the time, I write my tests in a Given-When-Then style. When using Mocha, it gives something like this (where the `it` defines the 'Then' parts):

```javascript
describe('<my-component>', () => {
  const el;
  context('Given: attribute foo="bar"' () => {
    beforeEach(() => {
      el = fixture('<my-component foo="bar"><my-component');
    });
    if('is cool', () => {
      expect(el).to.be.cool;
    });
    describe('When: attribute foo is set to a new string', () => {
      beforeEach(() => {
        el.setAttribute('foo', 'baz');
      });
      it(`is great`, () => {
        expect(el).to.be.great;
      });
    });
    describe('When: attribute foo is set to an empty string', () => {
      // etc...
    });
  });
});
```

With this approach, it gets easier to see that you often need to test the same behavior twice or more in for the same component. In other words: in some other series of 'Given' and 'When'.

This is where this last method gets handy, and this is why I use it very often.

## Conclusion

Let's summarize with some best practices.

**DO** Use arrow functions by default! It makes it clear that the Mocha contexts shouldn't be used in your project (most of the time, at least)!

**DO** Check if YAGNI before anything, every time!

**DON'T** Write shared behaviors every time you feel like it.
> You don't need to write a shared behavior as often as you may think!

**DO** use closures if you don't need to use a shared behavior in another file straight away

**DO** define a lambda for each test in another file if you don't need to define a whole set of tests in the same order with the same description

> **DON'T** use a higher-order function for those if there is less than 2 or 3 tests for a same "scope"

**DO** define your shared behavior with its before, beforeEach, after and afterEach in one big lambda function if your pre and post conditions are always the same for this behavior

**DON'T** use the Mocha "contexts" if one of the previous, simpler approaches is applicable

Finally, here is a flowchart to help you make the right decision every time:

![flowchart](./charts/decision.flowchart.svg)

> **Have any other idea permitting to define good shared behaviors? Any feedback or question about the one I have shown here?**
> **Leave a comment below, give me a sign on Twitter @noel_mace #WebOnFIRE or open an issue on Github!**

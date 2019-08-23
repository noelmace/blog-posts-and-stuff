---
title: Shared Behaviors best practices with Mocha
published: false
description:
tags: testing, mocha, open-wc, web components
---

Like many of you, I love unit testing! Because good coverage on a codebase makes me confident.
Tests help me understand what a code is about. Above all, they make me feel less frustrated when I debug :wink:

But here is something that can make any developer frustrated when they write or read tests: **sharing
behaviors**.

I see two reasons for this:

1. sharing behaviors can often lead to over-engineering tests
2. there are too many (bad) ways to do it

So, have a nice cup of tea, relax, and let's have a look at some ways to do it right...

## tl;dr <a name="tldr"></a>

Check out the examples and the decision flowchart in the associated project on Github:

{% github noelmace/mocha-shared-behaviors %}

## What we are going to talk about here

* [the recommendations from Mocha](#mocha-way)
* [the KISS Principle](#kiss)
* [what's the issue when using arrow functions with Mocha](#mocha-arrow)
* the alternative approaches
  1. [all-in-one](#all-in-one)
  2. [one-by-one](#one-by-one)
  3. [closures-only](#closures-only)
* summary
  * [requirements, pros & cons](#pro-cons)
  * ["guidelines"](#guidelines)

## The (old) Mocha way <a name="mocha-way"></a>

> complete example on Github :arrow_right: [test/mocha-way](https://github.com/noelmace/mocha-shared-behaviors/tree/master/test/mocha-way)

First things first! Let's see what the Mocha [documentation](https://github.com/mochajs/mocha/wiki/Shared-Behaviours)
itself says about this.

Mocha binds its context (the Mocha "contexts", aka the "this" keyword) to every callback you give to it. Meaning, in the
function you give to `describe`, `before`, `beforeEach`, `it`, `after` & `afterEach`, you can assign to `this` any data
or function you want, making it available for all the callbacks to be called in the same `describe`.

To illustrate how to use this to write shared behaviors, Mocha gives the following example.

> FYI, I took the liberty to update this code as "Open WC," using ES Modules and `expect` instead of CommonJS and
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

`Admin` obviously shares some behaviors with `User`. So, we can write these shared behaviors in a function using 
"contexts":

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

Finally, here are the tests:

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

### What's wrong with this approach <a name="wrong-this"></a>

This wiki page [hasn't been (significantly) edited](https://github.com/mochajs/mocha/wiki/Shared-Behaviours/_history) since January 2012! Way before ES2015!

This is why Mocha decided to [discourage using arrow
functions](https://github.com/mochajs/mocha/commit/2a91194f74ba09a4cf345b6accce2abac91b473a) in 2015 ... and no update
to this section of the documentation has been done since.

It's pretty old. There is also no documentation about field ownership, so you're exposed to future conflicts any time you use the Mocha "contexts".

Yet, those aren't the main issues with this approach. Using it, there is no way to clearly identify the requirements of your shared
behavior. In other words, you can't see the required data types and signature in its declaration context (i.e. closure)
or in the function signature (i.e. arguments). This isn't the best choice for readability and maintainability.

There are some ongoing discussions about this approach. Especially noteworthy: Christopher Hiller (aka Boneskull),
maintainer of Mocha since July 2014, published a first attempt of a ["functional"
interface](https://github.com/mochajs/mocha/pull/3399) in May 2018 (there are references at the end of this
article for more information on this). Yet, this PR is still open, and we can't, I think, expect any advancement on this
soon.

## Keep it simple, stupid! (KISS) <a name="kiss"></a>

To reiterate: **over-engineering is one of the main dangers when defining shared behaviors in your tests**!

I believe the [KISS principle](https://en.wikipedia.org/wiki/KISS_principle#In_software_development) is the top principle to keep in mind when you write tests.
Think [YAGNI](https://martinfowler.com/bliki/Yagni.html) (short for "You Ain't Gonna Need It")! Do not add a functionality before it's **necessary**! In most cases, [_Worse is better_](http://dreamsongs.com/WorseIsBetter.html)!

KISS is at the core of all good engineering. But when it comes to testing, it's its FUSION REACTOR CORE :bomb: !
If you forget this, it's the apocalypse of your project! Guaranteed!

If still have doubts, here is an argument from authority :wink: :

Jasmine permits handling shared behaviors pretty much the same way Mocha does (i.e. using the "this" keyword). Concerned
about this same issue, the contributors added the following "Caveats" chapter to the related documentation page.

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

So writing shared behaviors using the "`this` keyword" does work. And it can be pretty useful from time to time.
But it can also bring a lot of unneeded complexity to your tests.

**Avoid using the Mocha context as much as you can!**
_Same thing for shared behaviors in general!_

Let's deconstruct the previous example, and minimize its complexity step-by-step.

## using arrow functions with Mocha <a name="mocha-arrow"></a>

> complete example on Github :arrow_right: [test/mocha-way-arrow](https://github.com/noelmace/mocha-shared-behaviors/tree/master/test/mocha-way-arrow)

Back to the ["functional"
interface](https://github.com/mochajs/mocha/pull/3399) PR. Why would we need a "functional" interface in Mocha in the first place?

Let's try to rewrite the previous example using an arrow function. Of course, a lambda doesn't have a "this", so here
I'll use its closure.

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

This is because Mocha identifies and "records" your test suite first, and _then_ runs your callbacks. So here, it runs
`beforeEach` and `shouldBehaveLikeAUser` (`user` being undefined at this point) and only _then_ `beforeEach.fn` and `it.fn`.

<a name="alternatives"></a>

## "All-in-one" <a name="all-in-one"></a>

> complete example on Github :arrow_right: [test/all-in-one](https://github.com/noelmace/mocha-shared-behaviors/tree/master/test/all-in-one)

One solution is to move the `beforeEach` in `shouldBehaveLikeAUser`.

```javascript
/// helpers.js
export function shouldBehaveLikeAUser(buildUserFn, { firstName, lastName, fullname }) {
  let userLike;

  beforeEach(() => {
    userLike = buildUserFn();
  });
  
  it('should have .name.first', () => {
    expect(userLike.name.first).to.equal(firstName);
  });
  // other tests
};

/// user.test.js
describe('User', () => {
  shouldBehaveLikeAUser(() => new User("tobi", "holowaychuk"), {
    firstName: "tobi",
    lastName: "holowaychuk",
    fullname: 'tobi holowaychuk'
  });
});

/// admin.test.js
describe('Admin', () => {
  shouldBehaveLikeAUser(() => new Admin("tobi", "holowaychuk"), {
    firstName: "tobi",
    lastName: "holowaychuk",
    fullname: 'tobi holowaychuk'
  });
});
```

Here, nothing is "hidden." Just by looking at the signature, we understand that `shouldBehaveLikeAUser` will test that the constructor you gave will fit the "User" behavior definition. This can be enhanced by adding a JSDoc @param or some TypeScript.

And it's self-sufficient. No side effects or closure requirements here.

More important, it's completely isolated! You can't reuse `userLike`! You would have to repeat yourself, like this:

```javascript
it('should be an .admin', () => {
  expect(new Admin().admin).to.be.true;
});
```

This last point could be seen as an important issue. Yet, I believe it's actually an important advantage!
It's obvious that this helper isn't really useful if you need the same setup before or after using it.
You should use it if and only if you're actually testing a complex, self sufficient behavior.

## "one-by-one" <a name="one-by-one"></a>

> complete example on Github :arrow_right: [test/one-by-one](https://github.com/noelmace/mocha-shared-behaviors/tree/master/test/one-by-one)

If you need to share setups, it could mean that your behavior isn't well defined or identified.
Or maybe you shouldn't deal with this level of complexity (_YAGNI_, remember?).

Defining the behavior spec by spec, like in the following example, is often simpler.

```javascript
/// helpers.js
export const expectUserLike = user => ({
  toHaveNameFirstAs: expectation => {
    expect(user.name.first).to.equal(expectation);
  },
  toHaveNameLastAs: expectation => {
    expect(user.name.last).to.equal(expectation);
  },
  toHaveFullnameThatReturnAs: expectation => {
    expect(user.fullname()).to.equal(expectation);
  }
});

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

Now, this shared behavior isn't isolated anymore. And it's simple :kiss:!

Not being able to require that every aspect of the behavior is tested, to define any order, nor spec description, setup and tear down could be an important downside for some use cases. Yet, in my opinion, this isn't really needed as often as you may think.

This approach is often my preference. It's simple, explicit **and** permits definition of shared behaviors in separate files.

Yet, I only use it if separate files is an absolute requirement.

## The power of closures <a name="closures-only"></a>

> complete example on Github :arrow_right: [test/closure](https://github.com/noelmace/mocha-shared-behaviors/tree/master/test/closure)

If it isn't, simply use the lambda closure to share data between your shared behaviors.

Take the first example, from the Mocha Wiki. `user.test.js` and `admin.test.js` are actually in a single file, `test.js`. `User` and `Admin` are from the same "feature scope," so it feels right and logical to test those two as one.

With this idea, let's refactor a little.

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

#### my 2 cents about this method

Most of the time, I write my tests in a [Given-When-Then](https://martinfowler.com/bliki/GivenWhenThen.html) style. This is more a way to think you test than a way to write them! Here is an example to help you better understand what I'm talking about anyway.

> **FYI** Here, I only "replaced" `it` and `context` by `then.it`, `given` & `when` in order to make it more simple to understand.
> ```javascript
> const given = when = context;
> const then = { it };
> ```
> I DO NOT advise you to do this in your project!

```javascript
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

  given('attribute foo="bar"' () => {
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
```

With this approach, it is easier to see that you often need to test the same behavior more than once for the same component. In other words, in another series of 'Given' and 'When'. This is where this method is handy, and why I use it very often.

Yet, remember that repeating yourself could also be OK! You could also write your own Chai extension. It only depends on your preferences and what you're testing.

Now, it's time to summarize all this.

<a name="summary"></a>

## Requirements, Pros & Cons <a name="pro-cons"></a>

|    | [Mocha `this`](#mocha-way) | [all-in-one](#all-in-one) | [one-by-one](#one-by-one) | [closures only](#closure) |
| -- | -------------| ---------- | ---------- | ------------- |
| :thumbsup: KISS :kiss: | :x: | :x: | :heavy_check_mark: | :white_check_mark: |
| :thumbsup: No side effects or closure | :x: | :heavy_check_mark: | :heavy_check_mark: | :x: |
| :thumbsup: no hidden nor added logic | :x: | :x: | :white_check_mark: | :white_check_mark: |
| several tests at once | :heavy_check_mark: | :heavy_check_mark: | :x: | :heavy_check_mark: |
| can be exported | :heavy_check_mark: | :heavy_check_mark: | :heavy_check_mark: | :x: |

> :white_check_mark: = most of the time

## Guidelines <a name="guidelines"></a>

:heavy_check_mark: **DO** Use arrow functions by default. It makes it clear that the Mocha contexts shouldn't be used in your project (probably most of the time!)

:heavy_check_mark: **DO** Check if YAGNI before anything, every time!

:x: **DON'T** Write shared behaviors without thinking about it carefully. You probably don't need to write a shared behavior as often as you may think!

:x: **DON'T** use the Mocha "contexts" if at least one of the following :grey_question:**IF** is met

### shared behaviors in one file

:grey_question: ***IF you don't need to use a shared behavior in another file straight away***

:heavy_check_mark: **DO** favor using closures

:heavy_check_mark: **DO** keep a variable declaration close to it's initialization (& use)

### "one-by-one" <a name="guidelines-one-by-one"></a>

:grey_question: ***IF you don't need to define a whole set of tests in the same order with the same description.***

:heavy_check_mark: **DO** define one lambda for each test in another file

:x: **DON'T** use a higher-order function to join these lambdas if there are less than 2 or 3 tests for a same "scope."

### "all-in-one" <a name="guidelines-all-in-one"></a>

:grey_question: ***IF your pre- and post- conditions are always the same for this behavior***

:heavy_check_mark: **DO** define your shared behaviors with the 'before', 'beforeEach', 'after' and 'afterEach' in one big lambda function

### how to choose <a name="guidelines-flowchart"></a>

Last but not least, here is a flowchart to help you make the right decision every time:

![flowchart](./charts/decision.flowchart.svg)

> **Do you have other ideas for defining good shared behaviors? Any feedback or questions about the one I have shown here?**
>
> **Leave a comment below, tweet at me (@noel_mace #WebOnFIRE), or open an issue for the associated [project](noelmace/mocha-shared-behaviors) on Github**

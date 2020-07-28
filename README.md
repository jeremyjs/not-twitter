# not twitter

This is a submission to the Point backend challenge.

## Setup

```
git clone https://github.com/jeremyjs/not-twitter.git
cd not-twitter
npm install
openssl rand -hex 256 > ./keys/session.key
npm run watch
```

You may need to install a redis instance on your machine with default configurations.

## Testing

Automated tests were not implemented due to time constraints. In a production codebase, I would always prefer to set up automated testing as a first step.

Manual testing can be performed as follows.

Start the application. Follow the "Setup" section to do so. You may see TypeScript warnings or errors (this is fine, see notes in the "TypeScript" seciont of this README), and then a logging statement indicating that the server has started.

Load [GraphQL Playground](https://github.com/prisma-labs/graphql-playground) or navigate to [http://localhost:3000](http://localhost:3000). I perfer to use the desktop application since the web browser does not save queries on reload. If you use the desktop application, you'll need to connect to the URI `http://localhost:3000`.

You will need to modify the settings of GraphQL Playground to support auth sesions. To do so, click the settings gear in the top right. Then change the `"request.credentials"` setting from `"omit"` to `"include"`.

Next, you will find a `queries.gql` file in the project root. Copy the queries into the query editor of GraphQL Playground. You will need to omit the `Query Variables` section when copying to the GraphQL Playground query editor. Instead, paste that JSON object into the Query Variables section of GraphQL Playground.

Hopefully, you will now be able to run a query. Try using the Play button in GraphQL Playground to run the Signup query.

You should see a successful response that looks like the following:
```
{
  "data": {
    "signup": {
      "sessionId": "EqhavfSuxOLJbYc-GiDhQnjlfQOjTKqS",
      "user": {
        "id": "e50e1dbe-be06-43d8-ac0a-2893e5c44285",
        "name": "JJ",
        "email": "jj@gmail.com",
        "phone": ""
      }
    }
  }
}
```

If not, you will need to double check that you've correctly copied the example queries from `queries.gql`.

You can test the following queries in a similar manner:
- Signup and copy the `user.id` into the query params for `userId` & `authorId`
- You should be already "logged in" (i.e. authed) after Signup
- Run CreatePost to create a post
- Run PostsByCurrentUser to see your post
- Logout
- Run PostsByCurrentUser to see an error since you are no longer logged in
- You can also try CreatePost and see that you are unauthorized to create a post with that authorId
- Login to auth again
- Change the content and run UpdatePost
- Run PostsByUserId to test that functionality
- Run DeletePost
- Run PostsByUserId to see that post get deleted

## Maintenance

Generate a new session key

```
openssl rand -hex 256 > ./keys/session.key
```

## Tech Decisions

### TypeScript

Adds support for gradual, explicit typing. This can help reduce defects as the codebase grows, at the cost of added complexity. This is a choice supported by many in the industry, as dynamic typing can proliferate many classes of defects. TypeScript is not the only solution to this class of defects, but it's a simple one for this example project.

One issue faced was type support from libraries; `fastify-session` was giving a type error from basic usage documented in on the github repository. The error can be safely ignored; given more time I would diagnose and address the issue to reduce cognitive load for the developer and ensure no deeper issues are present.

### Fastify

Fastify was chosen for better perfomance and less overhead out of the box compared to Express. This decision was made because Point has a valid and reasonable goal of optimizing for performance and latency. We could get even faster by optimizing purely for speed (i.e. [https://nanoexpress.js.org/](https://nanoexpress.js.org/)) but I chose a middle-ground with similarity to Express. The full list of framework speed benchmarks is here: [https://github.com/the-benchmarker/web-frameworks](https://github.com/the-benchmarker/web-frameworks). For even better performance, we could use a true statically-typed compiled language.

#### Addendum: Why even use a web framework for a GraphQL server?

We could use apollo-server without an additional framework. However, we want the following features in particular:
- Session management
- Cookie parsing
- CSRF protection
- Monitoring or logging requests
- Rate limiting
- etc.

### Auth & Security

For authentication, we used server side sessions with a sessionId cookie to keep track of the currently logged in user. This works very cleanly out of the box. Cookies are generally preferred for storing session IDs.

`bcrypt` is used as the industry standard for password hashing. The plaintext password is sent over the wire, so HTTPS is obviously required in production.

For authorization, we used a few custom rules to ensure a logged in user can only modify their own posts. As the codebase grows, these rules can be managed using a different approach. This change would be introduced around the same time that we would introduce some implementation of GraphQL Modules and should be tailored to interoperate cleanly with that implementation.

We have a very simple CSRF policy which can be extended later as necessary.

### State Management

A very simple in-memory store was chosen. In production we would obviously require a persistent store, but this was deferred in favor of web server and graphql integration as mentioned in the "Challenges" section.

This implementation still showcases clean code and common patterns of data manipulation. Note that the actual function interfaces due a good job of isolating the business logic of the GraphQL resolvers from the impelementation of the acutal storage and modification; it would be easy enough to replace these impelementations with something like Prisma in the future.

Since I originally did a bit of research into persistent data stores before foregoing the implementation for simplicity reasons, I'll briefly cover the reasonsing here to showcase my expertise.

#### NoSQL vs. SQL

For this app, SQL would seem to be preferred intuitively due to the inherently relational nature of follows, replies, etc. NoSQL is a better fit for blobs of data such as analytics events and other amorphous or ambiguous data sets with few relations. Technically we should consider graph databases as well, but SQL serves a more proven track record and therefore industry support for social web app development.

Additionally, SQL tends to have better read performance, whereas NoSQL tends to have better write performance. Since we more often read these posts than write them, this supports our preference to use a SQL store.

#### PostgreSQL vs. MySQL

This decision has one idiosyncratic factor before an implementation should be chosen:
- GraphQL stack decisions (for integration reasons)
  - i.e. Prisma, PostGraphile, etc.

In practice, there happens to be better library support for PostgreSQL. This could override the decision if it was deemed to outweigh other trade-offs. But requires a more in-depth analysis of library support.

The remaining factors are more standard across web services regardless of REST vs. GraphQL vs. RPC
- Ease of use vs. configuration & tuning overhead
- Requirement for complex transaction support
- Performance considerations

PostgreSQL has better transaction support, which would be great for financial applications, but may not be required for a social app such as this one.

PostgreSQL has a larger feature set which empowers queries to be more complex
- Great for analytics power users
- May encourage complexity in development codebases

MySQL tends to have better performance, but at the cost of more configuration and fine-tuning.

MySQL seems to be slightly favored to support a social app as it scales, as long as the configuration and fine-tuning are supported as first-class concerns by the organization.

The final decision would be MySQL unless the analysis of GraphQL support favors PostgreSQL in spite of other considerations.

### Challenges Faced

Simplicity and performance were chosen as priorities for this project. This is just an example to demonstrate considerations, reasoning, and tradeoffs. In the real world, we would do a deeper analysis of the performance requirements and spend more time to consider a wider range of approaches, including the possiblity of using another language & platform for running the GraphQL server in lieu of Node.js.

In the process of researching an alternative web framework to Express, since I had not used Fastify before, it took some time to get implemented. While Apollo GraphQL server was origianlly under consideration, due to open source schedules, Fastify v3 has been recently released, but Apollo GraphQL server has not yet integrated with it. For that reason, `fastify-gql` was chosen instead. This ended up working very well, as `fastify-gql` is actually a great package.

Due to some of these issues, there was not time to also make a decision regarding the database, so this, in addition to simplicity, is the reason why an in-memory store was chosen. In production we would prefer to invest the time to select and integrate a datastore (obviously we need some kind of persistance).

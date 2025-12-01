# Code Standards and Best Practices

## Project Conventions

This document outlines the coding standards, architectural patterns, and best practices used throughout the e-commerce microservices codebase.

---

## TypeScript Standards

### Configuration
All backend services use consistent TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./build",
    "rootDir": "./src"
  }
}
```

### Type Safety
- **No `any` types**: Use explicit types or generics
- **Strict null checks**: Always handle undefined/null cases
- **Interface-based models**: Define interfaces for all data structures
- **Type guards**: Use type predicates for runtime type checking

**Example**:
```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  role: UserRole;
}

// ❌ Avoid
const user: any = { ... };
```

---

## Code Organization

### Directory Structure (Backend Services)

```
service-name/
├── src/
│   ├── app.ts              # Express app configuration
│   ├── index.ts            # Server entry point
│   ├── models/             # Mongoose models
│   │   ├── __test__/       # Model tests
│   │   └── model-name.ts
│   ├── routes/             # Route handlers
│   │   ├── __test__/       # Route tests
│   │   └── route-name.ts
│   ├── events/             # Kafka producers/consumers
│   │   ├── producers/
│   │   └── consumers/
│   ├── middlewares/        # Custom middleware (if any)
│   ├── services/           # Business logic services
│   └── test/               # Test setup
│       └── setup.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

### File Naming
- **Kebab-case**: `user-created-listener.ts`, `current-user.ts`
- **Test files**: `*.test.ts` suffix
- **Models**: Singular, PascalCase class names (e.g., `User`, `Product`)

---

## Express.js Patterns

### App Configuration ([app.ts](../auth/src/app.ts))

**Standard middleware order**:
```typescript
app.use(json());
app.use(cookieSession({ ... }));
app.use(currentUser);  // From common package
app.use(routes);
app.use(errorHandler); // Always last
```

### Route Handlers

**Pattern**: Export Express Router

```typescript
// routes/signup.ts
import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '@datnxecommerce/common';

const router = express.Router();

router.post(
  '/api/users/signup',
  [
    body('email').isEmail().withMessage('Email must be valid'),
    body('password').trim().isLength({ min: 4, max: 20 })
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    // Handler logic
  }
);

export { router as signupRouter };
```

**Best Practices**:
- Validation first (express-validator)
- Authentication middleware (`requireAuth`, `requireAdmin`)
- Error handling via throwing CustomError instances
- Return consistent JSON responses

### Error Handling

**Never use try-catch** - Use express-async-errors:
```typescript
import 'express-async-errors';

// Errors automatically caught and passed to error handler
router.post('/api/resource', async (req, res) => {
  if (!valid) {
    throw new BadRequestError('Invalid input');
  }
  // No try-catch needed
});
```

**Custom error classes** (from common package):
```typescript
throw new BadRequestError('Message');
throw new NotAuthorizedError();
throw new NotFoundError();
```

---

## MongoDB / Mongoose Standards

### Model Definition

**Pattern**: TypeScript interface + Mongoose schema + Static build method

```typescript
import mongoose from 'mongoose';

interface UserAttrs {
  email: string;
  password: string;
}

interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
  role: string;
}

interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttrs): UserDoc;
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' }
}, {
  toJSON: {
    transform(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.password;
      delete ret.__v;
    }
  }
});

userSchema.statics.build = (attrs: UserAttrs) => {
  return new User(attrs);
};

const User = mongoose.model<UserDoc, UserModel>('User', userSchema);

export { User };
```

**Key Points**:
- Three interfaces: Attrs (input), Doc (document), Model (static methods)
- Use `build()` method for type-safe creation
- Transform `_id` to `id` in JSON responses
- Remove sensitive fields (password, __v)

### Optimistic Concurrency Control

**Use mongoose-update-if-current** for versioning:

```typescript
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

productSchema.set('versionKey', 'version');
productSchema.plugin(updateIfCurrentPlugin);

// Ensures concurrent updates don't conflict
```

---

## Kafka Event-Driven Patterns

### Event Structure

**All events follow this pattern**:
```typescript
export interface ProductCreatedEvent {
  topic: Topics.ProductCreated;
  data: {
    id: string;
    version: number;
    title: string;
    price: number;
    userId: string;
    quantity: number;
    imageUrl: string;
  };
}
```

### Producer Implementation

**Extend BaseProducer** from common package:

```typescript
import { Producer, Topics, ProductCreatedEvent } from '@datnxecommerce/common';

export class ProductCreatedProducer extends Producer<ProductCreatedEvent> {
  topic: Topics.ProductCreated = Topics.ProductCreated;
}

// Usage
await new ProductCreatedProducer(kafkaWrapper.producer).send({
  id: product.id,
  version: product.version,
  title: product.title,
  price: product.price,
  userId: product.userId,
  quantity: product.quantity,
  imageUrl: product.imageUrl
});
```

### Consumer Implementation

**Extend BaseConsumer** from common package:

```typescript
import { Consumer, Topics, ProductCreatedEvent } from '@datnxecommerce/common';
import { Product } from '../../models/product';

export class ProductCreatedConsumer extends Consumer<ProductCreatedEvent> {
  topic: Topics.ProductCreated = Topics.ProductCreated;
  groupId = 'cart-product-created';

  async onMessage(data: ProductCreatedEvent['data']) {
    const { id, title, price, quantity, imageUrl } = data;

    const product = Product.build({
      id,
      title,
      price,
      quantity,
      imageUrl
    });

    await product.save();

    console.log(`Product created: ${id}`);
  }
}
```

**Key Points**:
- One consumer class per event type
- Unique `groupId` per service (enables horizontal scaling)
- Idempotent message handling (safe to process twice)
- Error handling via try-catch in consumer loop

### Consumer Setup ([index.ts](../products/src/index.ts))

```typescript
import { kafkaWrapper } from './kafka-wrapper';
import { PaymentCreatedConsumer } from './events/consumers/payment-created-consumer';

const start = async () => {
  // Connect Kafka
  await kafkaWrapper.connect();

  // Start consumers
  await new PaymentCreatedConsumer(kafkaWrapper.consumer).listen();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await kafkaWrapper.disconnect();
    process.exit();
  });

  // Start Express server
  app.listen(3000);
};

start();
```

---

## Authentication & Authorization

### JWT Token Strategy

**Access Token** (15-minute expiry):
```typescript
const userJwt = jwt.sign(
  {
    id: user.id,
    email: user.email,
    role: user.role
  },
  process.env.JWT_KEY!,
  { expiresIn: '15m' }
);

req.session = { jwt: userJwt };
```

**Refresh Token** (7-day expiry):
```typescript
const refreshToken = jwt.sign(
  { id: user.id },
  process.env.JWT_KEY!,
  { expiresIn: '7d' }
);

user.refreshToken = refreshToken;
user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
await user.save();
```

### Middleware Usage

**Protect routes**:
```typescript
import { currentUser, requireAuth, requireAdmin } from '@datnxecommerce/common';

// Extract user (optional)
router.get('/api/resource', currentUser, (req, res) => {
  // req.currentUser available (might be undefined)
});

// Require authentication
router.post('/api/resource', requireAuth, (req, res) => {
  // req.currentUser guaranteed to exist
});

// Require admin role
router.delete('/api/resource/:id', requireAuth, requireAdmin, (req, res) => {
  // req.currentUser.role === 'admin'
});
```

### Token Revocation

**On logout**:
```typescript
import { RevocationService } from '@datnxecommerce/common';

router.post('/api/users/signout', requireAuth, async (req, res) => {
  const token = req.session!.jwt;
  await RevocationService.revokeToken(token);
  req.session = null;
  res.send({});
});
```

**Check revocation** (requireNotRevoked middleware):
```typescript
router.get('/api/resource', requireAuth, requireNotRevoked, (req, res) => {
  // Token verified as not revoked
});
```

---

## Testing Standards

### Test Setup

**Global setup** ([src/test/setup.ts](../auth/src/test/setup.ts)):

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_KEY = 'test-jwt-key';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongo.stop();
  await mongoose.connection.close();
});
```

### Route Testing Pattern

```typescript
import request from 'supertest';
import { app } from '../../app';

it('returns 201 on successful signup', async () => {
  return request(app)
    .post('/api/users/signup')
    .send({
      name: 'test',
      email: 'test@test.com',
      password: 'password',
      phone: '1234567890',
      address: '123 Street'
    })
    .expect(201);
});

it('sets a cookie after successful signup', async () => {
  const response = await request(app)
    .post('/api/users/signup')
    .send({ ... })
    .expect(201);

  expect(response.get('Set-Cookie')).toBeDefined();
});
```

### Mock Kafka in Tests

```typescript
// src/__mocks__/kafka-wrapper.ts
export const kafkaWrapper = {
  producer: {
    send: jest.fn().mockResolvedValue({})
  },
  consumer: {
    subscribe: jest.fn(),
    run: jest.fn()
  }
};
```

---

## React / Next.js Standards (Frontend)

### Component Structure

**Server Component** (data fetching):
```typescript
// app/products/[productId]/page.jsx
import buildClient from '@/lib/build-client';
import ProductPageClient from './product-page-client';

export default async function ProductPage({ params }) {
  const { productId } = params;
  const client = buildClient();

  const { data: product } = await client.get(`/api/products/${productId}`);

  return <ProductPageClient product={product} />;
}
```

**Client Component** (interactivity):
```typescript
// app/products/[productId]/product-page-client.jsx
'use client';

import { useState } from 'react';
import { useCart } from '@/context/cart-context';

export default function ProductPageClient({ product }) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  const handleAddToCart = async () => {
    await addToCart(product.id, quantity);
  };

  return (
    <div>
      {/* Product UI */}
    </div>
  );
}
```

### Context API Pattern

```typescript
// context/cart-context.js
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export function CartProvider({ children, currentUser }) {
  const [cart, setCart] = useState(null);
  const [itemCount, setItemCount] = useState(0);

  const refreshCart = async () => {
    if (!currentUser) return;
    const { data } = await axios.get('/api/cart', { withCredentials: true });
    setCart(data);
    setItemCount(data.items.reduce((sum, item) => sum + item.quantity, 0));
  };

  useEffect(() => {
    refreshCart();
  }, [currentUser]);

  return (
    <CartContext.Provider value={{ cart, itemCount, refreshCart, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}
```

### API Calls

**Server-side** (in Server Component):
```typescript
import buildClient from '@/lib/build-client';

const client = buildClient(); // Auto-detects SSR, forwards cookies
const { data } = await client.get('/api/products');
```

**Client-side** (in Client Component):
```typescript
import axios from 'axios';

const { data } = await axios.post('/api/cart/add',
  { productId, quantity },
  { withCredentials: true }
);
```

---

## Environment Variables

### Backend Services

**Required**:
```bash
JWT_KEY=your-secret-key
MONGO_URI=mongodb://localhost:27017/service-name
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKERS=localhost:9092
```

**Service-specific**:
```bash
# Products service
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123

# Payments service
STRIPE_KEY=sk_test_...
```

### Frontend

```bash
API_GATEWAY_URL=http://auth-svc:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
WEBSOCKET_URL=wss://ecommerce.local/ws/notifications
```

---

## Git Workflow

### Branch Naming
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages
```
<type>: <short description>

<longer description if needed>

Examples:
feat: add product image upload
fix: resolve cart quantity bug
refactor: extract cart logic to context
docs: update API documentation
```

### Pull Request Standards
- Descriptive title
- Link to related issue
- Test coverage for new features
- No commented-out code
- Pass all CI checks

---

## Performance Best Practices

### Database
- **Indexing**: Index frequently queried fields (email, userId, productId)
- **Lean queries**: Use `.lean()` for read-only operations
- **Pagination**: Always paginate large result sets

### Kafka
- **Batch processing**: Process events in batches when possible
- **Idempotent consumers**: Design consumers to handle duplicate messages
- **Partition keys**: Use entity ID as partition key for ordering

### Frontend
- **Server Components**: Fetch data server-side when possible
- **Lazy loading**: Dynamic imports for heavy components
- **Image optimization**: Use Next.js Image component

---

## Security Best Practices

### Input Validation
- **Always validate**: Use express-validator on all inputs
- **Sanitize**: Trim and escape user inputs
- **Whitelist**: Only accept expected fields

### Secrets Management
- **Never commit secrets**: Use environment variables
- **Kubernetes secrets**: Store in k8s secrets, not ConfigMaps
- **Rotate regularly**: Change JWT keys and API keys periodically

### API Security
- **HTTPS only**: Always use TLS in production
- **Rate limiting**: Implement rate limiting (future enhancement)
- **CORS**: Configure CORS properly (whitelist origins)

---

## Documentation Standards

### Code Comments
- **Avoid obvious comments**: Code should be self-documenting
- **Document why, not what**: Explain business logic, not syntax
- **JSDoc for public APIs**: Document exported functions

**Example**:
```typescript
/**
 * Reserves inventory for an order.
 *
 * @param productId - The product to reserve
 * @param quantity - Amount to reserve
 * @throws {BadRequestError} if insufficient stock
 */
async function reserveInventory(productId: string, quantity: number) {
  // Implementation
}
```

### API Documentation
- Use Postman collection ([infra/postman/](../infra/postman/))
- Document request/response formats
- Include example payloads

---

## Code Review Checklist

- [ ] Follows TypeScript strict mode
- [ ] No unused imports or variables
- [ ] Error handling via CustomError classes
- [ ] Input validation on all endpoints
- [ ] Tests cover new functionality
- [ ] No hardcoded secrets
- [ ] Consistent naming conventions
- [ ] No console.log in production code (use proper logging)
- [ ] Database queries are optimized
- [ ] Event consumers are idempotent

---

This document reflects the current state of the codebase. All contributors should follow these standards to maintain code quality and consistency.

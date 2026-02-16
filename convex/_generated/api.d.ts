/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as email from "../email.js";
import type * as email_actions from "../email_actions.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_password from "../lib/password.js";
import type * as lib_rate_limit from "../lib/rate_limit.js";
import type * as lib_tier_config from "../lib/tier_config.js";
import type * as myEvents from "../myEvents.js";
import type * as responses from "../responses.js";
import type * as shared_types from "../shared_types.js";
import type * as stripe from "../stripe.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  email: typeof email;
  email_actions: typeof email_actions;
  events: typeof events;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/password": typeof lib_password;
  "lib/rate_limit": typeof lib_rate_limit;
  "lib/tier_config": typeof lib_tier_config;
  myEvents: typeof myEvents;
  responses: typeof responses;
  shared_types: typeof shared_types;
  stripe: typeof stripe;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

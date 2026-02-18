import Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").required(),
  PORT: Joi.number().default(3001),
  FRONTEND_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  GOOGLE_TOKENS_ENCRYPTION_SECRET: Joi.string().min(32).allow(""),
  JWT_EXPIRATION: Joi.string().required(),
  JWT_REFRESH_EXPIRATION: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
  GOOGLE_GA4_PROPERTY_ID: Joi.string().allow(""),
  OPENAI_API_KEY: Joi.string().required(),
  OPENAI_MODEL: Joi.string().default("gpt-4o-mini"),
  CLOUDFLARE_R2_BUCKET: Joi.string().allow(""),
  CLOUDFLARE_R2_ACCESS_KEY: Joi.string().allow(""),
  CLOUDFLARE_R2_SECRET_KEY: Joi.string().allow("")
});

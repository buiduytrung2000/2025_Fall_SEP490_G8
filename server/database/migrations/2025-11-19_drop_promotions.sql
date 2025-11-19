-- Migration: Drop Promotion-related tables
-- Date: 2025-11-19
-- Description: Remove Promotion, ProductPromotion, and PricingRulePromotion tables

USE CCMS_DB;

DROP TABLE IF EXISTS PricingRulePromotion;
DROP TABLE IF EXISTS ProductPromotion;
DROP TABLE IF EXISTS Promotion;


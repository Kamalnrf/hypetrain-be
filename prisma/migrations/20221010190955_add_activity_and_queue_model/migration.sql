/*
  Warnings:

  - Added the required column `isHyped` to the `TweetQueue` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TweetQueue" ADD COLUMN     "isHyped" BOOLEAN NOT NULL;

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1790913258388 implements MigrationInterface {
  name = 'InitSchema1790913258388';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying(255) NOT NULL, "username" character varying(100) NOT NULL, "password" character varying(255) NOT NULL, "bio" text, "image" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "comments" ("id" SERIAL NOT NULL, "body" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "author_id" integer NOT NULL, "article_id" integer NOT NULL, CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "UQ_d90243459a697eadb8ad56e9092" UNIQUE ("name"), CONSTRAINT "PK_e7dc17249a1148a1970748eda99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "articles" ("id" SERIAL NOT NULL, "slug" character varying(255) NOT NULL, "title" character varying(255) NOT NULL, "description" character varying(500) NOT NULL DEFAULT '', "body" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "author_id" integer NOT NULL, CONSTRAINT "UQ_1123ff6815c5b8fec0ba9fec370" UNIQUE ("slug"), CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_766eaf03c57b40f88a205e0c7e" ON "articles"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "article_favorites" ("user_id" integer NOT NULL, "article_id" integer NOT NULL, CONSTRAINT "PK_31af347dc5116ca4092699a9c83" PRIMARY KEY ("user_id", "article_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8d1bc602f86930d0b609972221" ON "article_favorites"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19fa0bc90b91678cc4d30e3737" ON "article_favorites"  ("article_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_follows" ("follower_id" integer NOT NULL, "following_id" integer NOT NULL, CONSTRAINT "PK_abc657d7ff1282910784b819171" PRIMARY KEY ("follower_id", "following_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f7af3bf8f2dcba61b4adc10823" ON "user_follows"  ("follower_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a71643cec3110af425f92e76e" ON "user_follows"  ("following_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "article_tags" ("article_id" integer NOT NULL, "tag_id" integer NOT NULL, CONSTRAINT "PK_dd79accc42e2f122f6f3ff7588a" PRIMARY KEY ("article_id", "tag_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f8c9234a4c4cb37806387f0c9e" ON "article_tags"  ("article_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1325dd0b98ee0f8f673db6ce19" ON "article_tags"  ("tag_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_e6d38899c31997c45d128a8973b" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" ADD CONSTRAINT "FK_e9b498cca509147e73808f9e593" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" ADD CONSTRAINT "FK_6515da4dff8db423ce4eb841490" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_favorites" ADD CONSTRAINT "FK_8d1bc602f86930d0b609972221a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_favorites" ADD CONSTRAINT "FK_19fa0bc90b91678cc4d30e37375" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follows" ADD CONSTRAINT "FK_f7af3bf8f2dcba61b4adc108239" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follows" ADD CONSTRAINT "FK_5a71643cec3110af425f92e76e5" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_tags" ADD CONSTRAINT "FK_f8c9234a4c4cb37806387f0c9e9" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_tags" ADD CONSTRAINT "FK_1325dd0b98ee0f8f673db6ce194" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "article_tags" DROP CONSTRAINT "FK_1325dd0b98ee0f8f673db6ce194"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_tags" DROP CONSTRAINT "FK_f8c9234a4c4cb37806387f0c9e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follows" DROP CONSTRAINT "FK_5a71643cec3110af425f92e76e5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_follows" DROP CONSTRAINT "FK_f7af3bf8f2dcba61b4adc108239"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_favorites" DROP CONSTRAINT "FK_19fa0bc90b91678cc4d30e37375"`,
    );
    await queryRunner.query(
      `ALTER TABLE "article_favorites" DROP CONSTRAINT "FK_8d1bc602f86930d0b609972221a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articles" DROP CONSTRAINT "FK_6515da4dff8db423ce4eb841490"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_e9b498cca509147e73808f9e593"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comments" DROP CONSTRAINT "FK_e6d38899c31997c45d128a8973b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1325dd0b98ee0f8f673db6ce19"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f8c9234a4c4cb37806387f0c9e"`,
    );
    await queryRunner.query(`DROP TABLE "article_tags"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a71643cec3110af425f92e76e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f7af3bf8f2dcba61b4adc10823"`,
    );
    await queryRunner.query(`DROP TABLE "user_follows"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19fa0bc90b91678cc4d30e3737"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8d1bc602f86930d0b609972221"`,
    );
    await queryRunner.query(`DROP TABLE "article_favorites"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_766eaf03c57b40f88a205e0c7e"`,
    );
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}

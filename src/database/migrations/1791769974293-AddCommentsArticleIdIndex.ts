import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommentsArticleIdIndex1791769974293 implements MigrationInterface {
  name = 'AddCommentsArticleIdIndex1791769974293';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_e9b498cca509147e73808f9e59" ON "comments"  ("article_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e9b498cca509147e73808f9e59"`,
    );
  }
}

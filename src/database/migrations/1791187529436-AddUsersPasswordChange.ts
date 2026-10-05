import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersPasswordChange1791187529436 implements MigrationInterface {
  name = 'AddUsersPasswordChange1791187529436';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_changed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_changed_jti" character varying(36)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_changed_jti"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "password_changed_at"`,
    );
  }
}

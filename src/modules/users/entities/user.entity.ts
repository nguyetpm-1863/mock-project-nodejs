import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Article } from '../../articles/entities/article.entity.js';
import { Comment } from '../../comments/entities/comment.entity.js';
import {
  PASSWORD_CHANGED_JTI_MAX_LENGTH,
  USER_EMAIL_MAX_LENGTH,
  USER_IMAGE_MAX_LENGTH,
  USER_PASSWORD_HASH_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
} from '../constants/user.constants.js';

@Entity('users')
@Check('CHK_users_email_lowercase', `"email" = LOWER("email")`)
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: USER_EMAIL_MAX_LENGTH, unique: true })
  email: string;

  @Column({ type: 'varchar', length: USERNAME_MAX_LENGTH, unique: true })
  username: string;

  @Column({
    type: 'varchar',
    length: USER_PASSWORD_HASH_MAX_LENGTH,
    select: false,
  })
  password: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: USER_IMAGE_MAX_LENGTH, nullable: true })
  image: string | null;

  @Column({ name: 'password_changed_at', type: 'timestamptz', nullable: true })
  passwordChangedAt: Date | null;

  @Column({
    name: 'password_changed_jti',
    type: 'varchar',
    length: PASSWORD_CHANGED_JTI_MAX_LENGTH,
    nullable: true,
  })
  passwordChangedJti: string | null;

  @OneToMany(() => Article, (article) => article.author)
  articles: Relation<Article[]>;

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Relation<Comment[]>;

  @ManyToMany(() => Article, (article) => article.favoritedBy)
  @JoinTable({
    name: 'article_favorites',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'article_id' },
  })
  favorites: Relation<Article[]>;

  @ManyToMany(() => User, (user) => user.followers)
  @JoinTable({
    name: 'user_follows',
    joinColumn: { name: 'follower_id' },
    inverseJoinColumn: { name: 'following_id' },
  })
  following: Relation<User[]>;

  @ManyToMany(() => User, (user) => user.following)
  followers: Relation<User[]>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

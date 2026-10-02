import {
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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

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

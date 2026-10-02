import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Comment } from '../../comments/entities/comment.entity.js';
import { Tag } from '../../tags/entities/tag.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  description: string;

  @Column({ type: 'text' })
  body: string;

  @ManyToOne(() => User, (user) => user.articles, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'author_id' })
  author: Relation<User>;

  @ManyToMany(() => Tag, (tag) => tag.articles)
  @JoinTable({
    name: 'article_tags',
    joinColumn: { name: 'article_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags: Relation<Tag[]>;

  @OneToMany(() => Comment, (comment) => comment.article)
  comments: Relation<Comment[]>;

  @ManyToMany(() => User, (user) => user.favorites)
  favoritedBy: Relation<User[]>;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

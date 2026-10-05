import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import type { CreateUserInput } from './interfaces/create-user-input.interface.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  findByEmailOrUsername(email: string, username: string): Promise<User[]> {
    return this.usersRepository.find({
      select: { email: true, username: true },
      where: [{ email }, { username }],
    });
  }

  create({ email, username, passwordHash }: CreateUserInput): Promise<User> {
    return this.usersRepository.save(
      this.usersRepository.create({
        email,
        username,
        password: passwordHash,
        bio: null,
        image: null,
      }),
    );
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import type { CreateUserInput } from './interfaces/create-user-input.interface.js';
import type { UpdateUserInput } from './interfaces/update-user-input.interface.js';

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

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
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

  findOthersByEmailOrUsername(
    id: number,
    { email, username }: Pick<UpdateUserInput, 'email' | 'username'>,
  ): Promise<User[]> {
    const where = [
      ...(email === undefined ? [] : [{ id: Not(id), email }]),
      ...(username === undefined ? [] : [{ id: Not(id), username }]),
    ];
    if (where.length === 0) {
      return Promise.resolve([]);
    }
    return this.usersRepository.find({
      select: { email: true, username: true },
      where,
    });
  }

  async update(
    id: number,
    { passwordHash, passwordChangedJti, ...changes }: UpdateUserInput,
  ): Promise<User | null> {
    await this.usersRepository.update(id, {
      ...changes,
      ...(passwordHash === undefined
        ? {}
        : {
            password: passwordHash,
            passwordChangedAt: new Date(),
            passwordChangedJti: passwordChangedJti ?? null,
          }),
    });
    return this.findById(id);
  }
}

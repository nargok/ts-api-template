import * as express from 'express'
import { getRepository } from 'typeorm'
import authMiddleware from '../middleware/auth.middleware'
import CreatePostDto from './post.dto'
import PostNotFoundException from '../exceptions/PostNotFoundException'
import Controller from '../interfaces/controller.interface'
import Post from './post.interface'
import PostModel from './post.entity'
import RequestWithUser from '../interfaces/requestWithUser.interface'

class PostsController implements Controller {
  public path = '/posts'
  public router = express.Router()
  private postRepository = getRepository(PostModel)

  constructor() {
    this.initializeRoutes()
  }

  public initializeRoutes() {
    this.router.get(this.path, this.getAllPosts)
    this.router.get(`${this.path}/:id`, this.getPostById)
    this.router
      .all(`${this.path}/*`, authMiddleware)
      .put(`${this.path}/:id`, this.modifyPost)
      .delete(`${this.path}/:id`, this.deletePost)      
      .post(this.path, authMiddleware, this.createPost)
  }

  private getAllPosts = async (request: express.Request, response: express.Response) => {
    const posts = await this.postRepository.find();
    response.send(posts)
  }

  private getPostById = async(request: express.Request, response: express.Response, next: express.NextFunction)  => {
    const id = request.params.id
    const post = await this.postRepository.findOne(id)
    if (post) {
      response.send(post)
    } else {
      next(new PostNotFoundException(id));
    }
  }

  private createPost = async (request: RequestWithUser, response: express.Response) => {
    const postData: CreatePostDto = request.body
    const newPost = this.postRepository.create({
      ...postData,
      author: request.user,
    })
    await this.postRepository.save(newPost)
    newPost.author.password = '';
    response.send(newPost)
  }

  private modifyPost = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const id = request.params.id
    const postData: Post = request.body
    await this.postRepository.update(id, postData)
    const updatedPost = await this.postRepository.findOne(id)
    if (updatedPost) {
      response.send(updatedPost)
    } else {
      next(new PostNotFoundException(id));
    }
  }
  
  private deletePost = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const id = request.params.id
    const deleteResponse = await this.postRepository.delete(id)
    if (deleteResponse.affected === 1) {
      response.sendStatus(200)
    } else {
      next(new PostNotFoundException(id));
    }
  }
}

export default PostsController;
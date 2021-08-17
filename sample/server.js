"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const mercurius_1 = __importDefault(require("mercurius"));
const index_1 = __importDefault(require("../src/index"));
const faker_1 = __importDefault(require("faker"));
const app = fastify_1.default({ logger: true });
const schema = `
  type Post {
    title: String
    body: String
  }
  type Query {
    add(x: Int, y: Int): Int
    word: String
    post: Post!
  }
`;
const resolvers = {
    Query: {
        add(_, { x, y }, { reply }) {
            return __awaiter(this, void 0, void 0, function* () {
                reply.log.info('add called');
                // for (let i = 0; i < 10000000; i++) {}
                return x + y;
            });
        },
        post() {
            return __awaiter(this, void 0, void 0, function* () {
                return {
                    title: '',
                    body: ''
                };
            });
        },
        word() {
            return faker_1.default.lorem.word();
        }
    }
};
app.register(require('fastify-cors')); // you need this if you want to be able to add the server to apollo studio and get introspection working in the modal for adding new graph
app.register(mercurius_1.default, {
    schema,
    resolvers,
    graphiql: true
});
app.register(index_1.default, {
    apiKey: 'service:mercurius-apollo-tracing:KTOI8UoO7aj4PwkFX5WxBw',
    graphRef: 'mercurius-apollo-tracing@current'
});
app.listen(3333);

FROM node:24-alpine

WORKDIR /app
COPY server/package*.json ./server/
RUN npm ci --prefix server --omit=dev

COPY . .
ENV NODE_ENV=production
ENV DB_DRIVER=sqlite
ENV SQLITE_PATH=/data/campus-secondhand.sqlite
EXPOSE 3000

CMD ["npm", "start"]

# Use Node.js for running the server
FROM node:18

WORKDIR /app

# Copy server package.json and install dependencies
COPY server/package.json server/package-lock.json ./
RUN npm install

# Copy the server source code into the container
COPY server/ ./

# Expose the port your server listens on
EXPOSE 3001

# Start the server
CMD ["node", "index.js"]

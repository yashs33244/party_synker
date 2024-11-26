# Use Node.js for building and running the app
FROM node:18

WORKDIR /app

# Copy client package.json and install dependencies
COPY client/package.json client/package-lock.json ./
RUN npm install

# Copy the client source code into the container
COPY client/ ./

# Set the environment variable for the React app
ARG REACT_APP_SOCKET_IO_URL
ENV REACT_APP_SOCKET_IO_URL=$REACT_APP_SOCKET_IO_URL

# Build the React app
RUN npm run build

# Install `serve` to serve the built files on port 3000
RUN npm install -g serve

# Set the working directory to the build output
WORKDIR /app/build

# Expose port 3000
EXPOSE 3000

# Serve the built React app on port 3000
CMD ["serve", "-s", ".", "-l", "3000"]

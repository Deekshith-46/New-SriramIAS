const { JWTTokenBuilder } = require("@100mslive/server-sdk");
const axios = require('axios');

// 100ms API Base URL
const HMS_BASE_URL = 'https://api.100ms.live/v2';

// Initialize HMS Client
const hmsClient = {
   // Create a room
   createRoom: async (roomData) => {
      try {
         const response = await axios.post(
            `${HMS_BASE_URL}/rooms`,
            {
               name: roomData.name,
               description: roomData.description,
               template_id: roomData.template_id
            },
            {
               auth: {
                  username: process.env.HMS_ACCESS_KEY,
                  password: process.env.HMS_SECRET
               }
            }
         );
         return response.data;
      } catch (error) {
         console.error('HMS Create Room Error:', error.response?.data || error.message);
         throw error;
      }
   },

   // Generate auth token for joining room
   generateToken: async (roomId, userId, role) => {
      try {
         // FIX 9: Add token expiration (1 hour)
         const expirationTime = Math.floor(Date.now() / 1000) + (60 * 60);

         const tokenBuilder = new JWTTokenBuilder()
            .setAccessKey(process.env.HMS_ACCESS_KEY)
            .setSecret(process.env.HMS_SECRET)
            .setRoomId(roomId)
            .setUserId(userId)
            .setRole(role)
            .setType('app')
            .setVersion(2)
            .setExpiration(expirationTime);

         const token = tokenBuilder.build();
         return token;
      } catch (error) {
         console.error('HMS Token Generation Error:', error.message);
         throw error;
      }
   }
};

module.exports = hmsClient;

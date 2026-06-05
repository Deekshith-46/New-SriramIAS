const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sriram IAS - Current Affairs CMS API',
      version: '1.0.0',
      description:
        'Admin CMS APIs for managing Current Affairs content across five categories.'
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:5000',
        description: 'API Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        CurrentAffair: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            category: {
              type: 'string',
              enum: [
                'CURRENT_AFFAIRS',
                'MONTHLY_MAGAZINE',
                'INFOGRAPHICS',
                'MONTHLY_RECAP',
                'DAILY_PRACTICE_QUESTIONS'
              ]
            },
            title: { type: 'string' },
            magazineName: { type: 'string' },
            year: { type: 'integer' },
            month: { type: 'string' },
            description: { type: 'string' },
            pdfUrl: { type: 'string', nullable: true },
            imageUrl: { type: 'string', nullable: true },
            status: { type: 'boolean' },
            isDeleted: { type: 'boolean' },
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { $ref: '#/components/schemas/CurrentAffair' }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            count: { type: 'integer' },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/CurrentAffair' }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    paths: {
      '/api/current-affairs': {
        get: {
          tags: ['Current Affairs'],
          summary: 'Get all current affairs',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            {
              name: 'category',
              in: 'query',
              schema: {
                type: 'string',
                enum: [
                  'CURRENT_AFFAIRS',
                  'MONTHLY_MAGAZINE',
                  'INFOGRAPHICS',
                  'MONTHLY_RECAP',
                  'DAILY_PRACTICE_QUESTIONS'
                ]
              }
            },
            { name: 'year', in: 'query', schema: { type: 'integer' } },
            { name: 'month', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'boolean' } },
            { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'createdAt' } },
            { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
          ],
          responses: {
            200: {
              description: 'Paginated list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PaginatedResponse' }
                }
              }
            }
          }
        },
        post: {
          tags: ['Current Affairs'],
          summary: 'Create current affair',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['category', 'year', 'month'],
                  properties: {
                    category: { type: 'string' },
                    title: { type: 'string' },
                    magazineName: { type: 'string' },
                    year: { type: 'integer' },
                    month: { type: 'string' },
                    description: { type: 'string' },
                    pdf: { type: 'string', format: 'binary' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' }
                }
              }
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' }
                }
              }
            }
          }
        }
      },
      '/api/current-affairs/{id}': {
        get: {
          tags: ['Current Affairs'],
          summary: 'Get current affair by ID',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: {
              description: 'Single record',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SuccessResponse' }
                }
              }
            },
            404: { description: 'Not found' }
          }
        },
        put: {
          tags: ['Current Affairs'],
          summary: 'Update current affair',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    title: { type: 'string' },
                    magazineName: { type: 'string' },
                    year: { type: 'integer' },
                    month: { type: 'string' },
                    description: { type: 'string' },
                    pdf: { type: 'string', format: 'binary' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Updated' },
            404: { description: 'Not found' }
          }
        },
        delete: {
          tags: ['Current Affairs'],
          summary: 'Soft delete current affair',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Soft deleted' },
            404: { description: 'Not found' }
          }
        }
      },
      '/api/current-affairs/{id}/status': {
        patch: {
          tags: ['Current Affairs'],
          summary: 'Toggle current affair status',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'boolean' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Status updated' },
            404: { description: 'Not found' }
          }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec
};

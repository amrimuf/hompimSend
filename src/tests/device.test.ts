import request from 'supertest';
import { expect } from 'chai';
import app from '../index';

describe('------Device API------', () => {
    let authToken: string;
    let accountApiKey: string;
    let deviceId: number;

    before(async () => {
        const response = await request(app)
            .post('/auth/register')
            .send({
                username: 'testuser',
                phone: '628886945381',
                email: 'test@example.com',
                password: 'P4$sword!!!',
                confirmPassword: 'P4$sword!!!',
            })
            .set('Content-Type', 'application/json');

        authToken = response.body.accessToken;
        accountApiKey = response.body.accountApiKey;
    });

    describe('Create Device', () => {
        it('should create a new device with valid data', async () => {
            const response = await request(app)
                .post('/devices/create')
                .send({
                    name: 'Test Device',
                    labels: ['Label1', 'Label2'],
                })
                .set('Content-Type', 'application/json')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Forwardin-Key', accountApiKey)
                .expect(201);
            deviceId = response.body.data.id;

            expect(response.body).to.have.property('message', 'Device created successfully');
            expect(response.body).to.have.property('data', response.body.data);
        });

        it('should return an error with invalid data', async () => {
            await request(app)
                .post('/devices/create')
                .send({
                    // Invalid data (missing required fields)
                })
                .set('Content-Type', 'application/json')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Forwardin-Key', accountApiKey)
                .expect(500);
        });
    });

    describe('Delete Device', () => {
        it('should delete a device by ID', async () => {
            const response = await request(app)
                .delete(`/devices/${deviceId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Forwardin-Key', accountApiKey)
                .expect(200);

            expect(response.body).to.have.property('message', 'Device deleted successfully');
        });

        it('should return an error when trying to delete a non-existent device', async () => {
            await request(app)
                .delete('/devices/nonexistent-device-id')
                .set('Authorization', `Bearer ${authToken}`)
                .set('X-Forwardin-Key', accountApiKey)
                .expect(400);
        });
    });

    after(async () => {
        await request(app)
            .delete('/users/delete')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Forwardin-Key', accountApiKey)
            .expect(200);
    });
});

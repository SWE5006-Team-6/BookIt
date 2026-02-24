import { BaseEmailTemplate } from '../../../../src/notification/templates/base-email.template';

class TestTemplate extends BaseEmailTemplate<{ name: string }> {
  protected buildSubject(data: { name: string }): string {
    return `Sub ${data.name}`;
  }

  protected buildText(data: { name: string }): string {
    return `Txt ${data.name}`;
  }

  protected buildHtml(data: { name: string }): string {
    return `<p>${data.name}</p>`;
  }
}

describe('BaseEmailTemplate', () => {
  it('should build subject, text and html through template method', () => {
    const template = new TestTemplate();

    const result = template.build({ name: 'User' });

    expect(result).toEqual({
      subject: 'Sub User',
      text: 'Txt User',
      html: '<p>User</p>',
    });
  });
});

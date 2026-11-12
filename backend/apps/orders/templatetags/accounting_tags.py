from django import template

register = template.Library()


@register.filter
def toman(value):
    return f"{int(value):,}".replace(",", "٬")

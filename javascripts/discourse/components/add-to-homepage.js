import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import Category from "discourse/models/category";
import { defaultHomepage } from "discourse/lib/utilities";

export default class AddToHomepage extends Component {
  @service currentUser;
  @service store;
  @service router;
  @tracked topicLists = [];
  @tracked allTopics = [];
  @tracked isLoading = true;
  @tracked noContent = false;

  get sidebarCategoryIds() {
    return this.currentUser.sidebar_category_ids;
  }

  get sidebarTags() {
    return this.currentUser.sidebar_tags;
  }

  get shouldRender() {
    return (
      this.currentUser &&
      this.router.currentRouteName === `discovery.${defaultHomepage()}`
    );
  }

  @action
  async getTopics(filterType, filterValue) {
    let topicList = await this.store.findFiltered("topicList", {
      filter: "latest",
      params: {
        [filterType]: [filterValue],
        limit: 3,
      },
    });

    return {
      type: filterType,
      id: filterType === "category" ? filterValue : undefined,
      name: filterValue,
      topics: topicList,
    };
  }

  @action
  async getTopicsLists() {
    this.topicLists = [];
    this.allTopics = [];
    this.isLoading = true;

    let topicLists = [];

    for (let categoryId of this.sidebarCategoryIds) {
      let categoryResult = await this.getTopics("category", categoryId);
      let category = Category.findById(categoryId);
      categoryResult.name = category.name;
      topicLists.push(categoryResult);
    }

    for (let tag of this.sidebarTags) {
      let tagResult = await this.getTopics("tags", tag.name);
      tagResult.name = tag.name;
      tagResult.id = tag.name;
      topicLists.push(tagResult);
    }

    this.topicLists = topicLists;

    let allTopics = [];
    topicLists.forEach((item) => {
      if (Array.isArray(item.topics.topics)) {
        allTopics.push(...item.topics.topics);
      }
    });

    let uniqueTopics = allTopics
      .filter(
        (topic, index, self) =>
          index === self.findIndex((t) => t.id === topic.id)
      )
      .sort((a, b) => new Date(b.last_posted_at) - new Date(a.last_posted_at));

    if (uniqueTopics.length === 0) {
      this.noContent = true;
    } else {
      this.noContent = false;
    }

    this.allTopics = uniqueTopics;
    this.isLoading = false;
  }
}
